'use strict';
const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const config = require('../config');
const { db, toJson, fromJson } = require('../db');
const catalog = require('../catalog');
const { requireStaff, requireAdmin, publicUser } = require('../auth');
const mailer = require('../mailer');
const { check, HttpError, sqlNow } = require('../util');
const { orderView } = require('./public');
const { dailyDeals } = require('../seeds/01_catalog');

const r = express.Router();
r.use(requireStaff);
// Any change made in the admin refreshes the cached data used for search-engine pages.
r.use((req, res, next) => { if (req.method !== 'GET') res.on('finish', () => require('../seo').invalidate()); next(); });

const STATUSES = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'];
const csvCell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csv = (rows, cols) => [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n');

/* ---------- dashboard ---------- */
r.get('/stats', async (req, res) => {
  const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
  const [totals, perDay, low, pending] = await Promise.all([
    db('orders').whereNot({ status: 'cancelled' }).count({ n: '*' }).sum({ revenue: 'total' }).first(),
    db('orders').whereNot({ status: 'cancelled' }).andWhere('created_at', '>=', since)
      .select(db.raw('DATE(DATE_ADD(created_at, INTERVAL 345 MINUTE)) as day')).count({ n: '*' }).sum({ v: 'total' }).groupBy('day'),
    db('products').where({ active: true, quote_only: false }).andWhere('stock', '<=', 8).orderBy('stock').limit(15).select('id', 'name', 'stock'),
    Promise.all([
      db('orders').where({ status: 'placed' }).count({ n: '*' }).first(),
      db('quotes').where({ status: 'new' }).count({ n: '*' }).first(),
      db('dealer_applications').where({ status: 'pending' }).count({ n: '*' }).first(),
      db('questions').whereNull('answer').count({ n: '*' }).first(),
      db('service_requests').where({ status: 'new' }).count({ n: '*' }).first()
    ])
  ]);
  const recent = await db('orders').orderBy('id', 'desc').limit(8).select('order_no', 'name', 'total', 'status', 'created_at');
  res.json({
    orders: Number(totals.n), revenue: Number(totals.revenue || 0),
    perDay: perDay.map((d) => ({ day: String(d.day).slice(0, 10), n: Number(d.n), v: Number(d.v) })),
    lowStock: low, recent,
    pending: { orders: Number(pending[0].n), quotes: Number(pending[1].n), dealers: Number(pending[2].n), questions: Number(pending[3].n), service: Number(pending[4].n) }
  });
});

/* ---------- products ---------- */
r.get('/products', async (req, res) => {
  // Staff always see the real price, even for "Get quote" products whose price is hidden in the store.
  const [list, raw] = await Promise.all([catalog.listProducts({ includeInactive: true }), db('products').select('id', 'price', 'mrp', 'show_price', 'sort')]);
  const m = new Map(raw.map((x) => [x.id, x]));
  res.json({ products: list.map((p) => { const x = m.get(p.id) || {}; return { ...p, price: x.price, mrp: x.mrp, showPrice: !!x.show_price, sort: x.sort }; }) });
});

const productSchema = z.object({
  name: z.string().trim().min(2).max(255), brand: z.string().trim().min(1).max(120), model: z.string().trim().max(120).optional().or(z.literal('')),
  cat: z.string().min(1), sub: z.string().min(1).max(120), art: z.string().max(40).optional(),
  price: z.coerce.number().int().min(0).nullable().optional(), mrp: z.coerce.number().int().min(0).nullable().optional(),
  quote: z.boolean().optional(), show_price: z.boolean().optional(), stock: z.coerce.number().int().min(0).max(1000000).optional(),
  tags: z.array(z.string().max(20)).max(10).optional(), hl: z.array(z.string().max(300)).max(12).optional(),
  specs: z.record(z.string(), z.string().max(300)).optional(), warranty: z.string().max(120).optional().or(z.literal('')),
  breaks: z.array(z.tuple([z.number().int().min(1), z.number().int().min(0)])).max(10).nullable().optional(),
  fbt: z.array(z.string()).max(8).optional(), active: z.boolean().optional(), sort: z.coerce.number().int().optional()
});
function productRow(d) {
  const row = {};
  if (d.name !== undefined) row.name = d.name;
  if (d.brand !== undefined) row.brand = d.brand;
  if (d.model !== undefined) row.model = d.model || null;
  if (d.cat !== undefined) row.cat_id = d.cat;
  if (d.sub !== undefined) row.sub = d.sub;
  if (d.art !== undefined) row.art = d.art;
  if (d.price !== undefined) row.price = d.price;
  if (d.mrp !== undefined) row.mrp = d.mrp;
  if (d.quote !== undefined) row.quote_only = d.quote;
  if (d.show_price !== undefined) row.show_price = d.show_price;
  if (d.stock !== undefined) row.stock = d.stock;
  if (d.tags !== undefined) row.tags = toJson(d.tags);
  if (d.hl !== undefined) row.highlights = toJson(d.hl);
  if (d.specs !== undefined) row.specs = toJson(d.specs);
  if (d.warranty !== undefined) row.warranty = d.warranty || null;
  if (d.breaks !== undefined) row.breaks = toJson(d.breaks);
  if (d.fbt !== undefined) row.fbt = toJson(d.fbt);
  if (d.active !== undefined) row.active = d.active;
  if (d.sort !== undefined) row.sort = d.sort;
  return row;
}
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

r.post('/products', async (req, res) => {
  const d = check(productSchema, req.body);
  if (!(await db('categories').where({ id: d.cat }).first())) throw new HttpError(400, 'Choose a valid category.');
  let id = slugify(d.model || d.name) || 'item';
  if (await db('products').where({ id }).first()) id = `${id}-${crypto.randomInt(100, 999)}`;
  if (d.quote === false && d.price == null) throw new HttpError(400, 'Enter a price to sell this online, or choose “Get quote”.');
  const row = { id, ...productRow(d), quote_only: d.quote ?? d.price == null, mrp: d.mrp ?? d.price ?? null, tags: toJson(d.tags || ['new']), highlights: toJson(d.hl || []), specs: toJson(d.specs || {}), fbt: toJson(d.fbt || []), stock: d.stock || 0, sort: -1 };
  await db('products').insert(row);
  res.status(201).json({ product: await catalog.getProduct(id) });
});

r.put('/products/:id', async (req, res) => {
  const d = check(productSchema.partial(), req.body);
  const before = await db('products').where({ id: req.params.id }).first();
  if (!before) throw new HttpError(404, 'Product not found.');
  const row = productRow(d);
  const willQuote = row.quote_only !== undefined ? row.quote_only : !!before.quote_only;
  const willPrice = row.price !== undefined ? row.price : before.price;
  if (!willQuote && willPrice == null) throw new HttpError(400, 'Enter a price to sell this online, or choose “Get quote”.');
  if (row.price !== undefined && row.price !== null && (before.mrp == null || before.mrp < row.price) && row.mrp === undefined) row.mrp = row.price;
  row.updated_at = sqlNow();
  await db('products').where({ id: before.id }).update(row);
  res.json({ product: await catalog.getProduct(before.id) });
});

r.delete('/products/:id', async (req, res) => {
  const used = await db('order_items').where({ product_id: req.params.id }).first();
  if (used) await db('products').where({ id: req.params.id }).update({ active: false });
  else await db('products').where({ id: req.params.id }).del();
  res.json({ ok: true, archived: !!used });
});

/* product images */
fs.mkdirSync(config.uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (req, file, cb) => cb(null, `${slugify(req.params.id)}-${Date.now()}${path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.jpg'}`)
  }),
  limits: { fileSize: 4 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype))
});
r.post('/products/:id/images', upload.array('images', 6), async (req, res) => {
  if (!(await db('products').where({ id: req.params.id }).first())) throw new HttpError(404, 'Product not found.');
  if (!req.files || !req.files.length) throw new HttpError(400, 'Choose JPG, PNG or WebP images up to 4 MB each.');
  const max = await db('product_images').where({ product_id: req.params.id }).max({ m: 'sort' }).first();
  let s = (max.m || 0) + 1;
  await db('product_images').insert(req.files.map((f) => ({ product_id: req.params.id, url: '/uploads/' + f.filename, sort: s++ })));
  res.status(201).json({ product: await catalog.getProduct(req.params.id) });
});
r.delete('/products/:id/images', async (req, res) => {
  const url = String(req.query.url || '');
  const img = await db('product_images').where({ product_id: req.params.id, url }).first();
  if (img) {
    await db('product_images').where({ id: img.id }).del();
    const file = path.join(config.uploadDir, path.basename(img.url));
    fs.promises.unlink(file).catch(() => {});
  }
  res.json({ product: await catalog.getProduct(req.params.id) });
});

/* ---------- orders ---------- */
r.get('/orders', async (req, res) => {
  const q = db('orders').orderBy('id', 'desc').limit(Math.min(500, Number(req.query.limit) || 200));
  if (STATUSES.includes(req.query.status)) q.where({ status: req.query.status });
  if (req.query.q) q.where((w) => w.where('order_no', 'like', `%${req.query.q}%`).orWhere('phone', 'like', `%${req.query.q}%`).orWhere('name', 'like', `%${req.query.q}%`));
  const rows = await q.select('order_no', 'name', 'phone', 'total', 'status', 'pay_method', 'pay_status', 'method', 'zone_name', 'install', 'created_at');
  res.json({ orders: rows });
});
r.get('/orders.csv', async (req, res) => {
  const rows = await db('orders').orderBy('id', 'desc').limit(5000);
  res.type('text/csv').attachment('technotri-orders.csv').send(csv(rows, ['order_no', 'created_at', 'name', 'phone', 'email', 'pan', 'method', 'zone_name', 'city', 'street', 'status', 'pay_method', 'pay_status', 'items_total', 'discount', 'shipping', 'total', 'vat']));
});
r.put('/orders/:no', async (req, res) => {
  const d = check(z.object({ status: z.enum(STATUSES).optional(), payStatus: z.string().max(40).optional(), note: z.string().max(255).optional(),
    name: z.string().trim().min(2).max(120).optional(), phone: z.string().trim().max(20).optional(), email: z.string().trim().max(190).optional(), pan: z.string().trim().max(20).optional(),
    city: z.string().trim().max(120).optional(), ward: z.string().trim().max(120).optional(), street: z.string().trim().max(255).optional(), notes: z.string().max(1000).optional() }), req.body);
  const o = await db('orders').where({ order_no: req.params.no }).first();
  if (!o) throw new HttpError(404, 'Order not found.');
  await db.transaction(async (trx) => {
    const upd = {};
    if (d.status && d.status !== o.status) {
      upd.status = d.status;
      if (d.status === 'delivered' && o.pay_status === 'cash on delivery') upd.pay_status = 'paid (cash)';
      if (d.status === 'cancelled') {
        const items = await trx('order_items').where({ order_id: o.id });
        for (const i of items) if (i.product_id) await trx('products').where({ id: i.product_id }).increment('stock', i.qty);
      }
      if (o.status === 'cancelled' && d.status !== 'cancelled') throw new HttpError(409, 'A cancelled order cannot be reopened. Ask the customer to order again.');
      await trx('order_events').insert({ order_id: o.id, status: d.status, note: d.note || null, by_user: req.user.id });
    }
    if (d.note && !(d.status && d.status !== o.status)) await trx('order_events').insert({ order_id: o.id, status: o.status, note: d.note, by_user: req.user.id, kind: 'note' });
    if (d.payStatus) upd.pay_status = d.payStatus;
    for (const k of ['name', 'phone', 'email', 'pan', 'city', 'ward', 'street', 'notes']) if (d[k] !== undefined) upd[k] = d[k] || null;
    if (Object.keys(upd).length) await trx('orders').where({ id: o.id }).update(upd);
  });
  const view = await orderView(o.order_no);
  if (d.status && d.status !== o.status) mailer.orderStatus({ order_no: o.order_no, email: o.email, status: d.status });
  res.json({ order: view });
});

/* ---------- quotes & service ---------- */
r.get('/quotes', async (req, res) => {
  const rows = await db('quotes').orderBy('id', 'desc').limit(300);
  res.json({ quotes: rows.map((q) => ({ ...q, items: fromJson(q.items, []), site_visit: !!q.site_visit })) });
});
r.put('/quotes/:no', async (req, res) => {
  const d = check(z.object({ status: z.enum(['new', 'quoted', 'won', 'closed']).optional(), note: z.string().max(2000).optional() }), req.body);
  await db('quotes').where({ quote_no: req.params.no }).update({ ...(d.status ? { status: d.status } : {}), ...(d.note !== undefined ? { staff_note: d.note } : {}) });
  res.json({ ok: true });
});
r.get('/service-requests', async (req, res) => res.json({ requests: await db('service_requests').orderBy('id', 'desc').limit(300) }));
r.put('/service-requests/:no', async (req, res) => {
  const d = check(z.object({ status: z.enum(['new', 'in progress', 'resolved']) }), req.body);
  await db('service_requests').where({ request_no: req.params.no }).update({ status: d.status });
  res.json({ ok: true });
});

/* ---------- dealers & customers ---------- */
r.get('/dealers', async (req, res) => {
  const rows = await db('dealer_applications').join('users', 'users.id', 'dealer_applications.user_id').orderBy('dealer_applications.id', 'desc')
    .select('dealer_applications.*', 'users.name', 'users.phone', 'users.email');
  res.json({ dealers: rows });
});
r.put('/dealers/:id', async (req, res) => {
  const d = check(z.object({ status: z.enum(['approved', 'rejected']) }), req.body);
  const app = await db('dealer_applications').where({ id: req.params.id }).first();
  if (!app) throw new HttpError(404, 'Application not found.');
  await db.transaction(async (trx) => {
    await trx('dealer_applications').where({ id: app.id }).update({ status: d.status, decided_by: req.user.id, decided_at: sqlNow() });
    await trx('users').where({ id: app.user_id }).update({ dealer_status: d.status });
  });
  const u = await db('users').where({ id: app.user_id }).first();
  mailer.dealerDecision(u, d.status);
  res.json({ ok: true });
});
r.get('/customers', async (req, res) => {
  const rows = await db('users').orderBy('id', 'desc').limit(500)
    .select('id', 'name', 'phone', 'email', 'role', 'dealer_status', 'active', 'created_at', 'last_login_at',
      db('orders').count('*').whereRaw('orders.user_id = users.id').as('orders'));
  res.json({ customers: rows });
});
r.put('/customers/:id', requireAdmin, async (req, res) => {
  const d = check(z.object({ role: z.enum(['customer', 'staff', 'admin']).optional(), active: z.boolean().optional() }), req.body);
  if (Number(req.params.id) === req.user.id) throw new HttpError(400, 'You cannot change your own role or access.');
  await db('users').where({ id: req.params.id }).update(d);
  res.json({ ok: true });
});
r.post('/staff', requireAdmin, async (req, res) => {
  const d = check(z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().toLowerCase().email(), password: z.string().min(8, 'Use at least 8 characters.'), role: z.enum(['staff', 'admin']) }), req.body);
  if (await db('users').where({ email: d.email }).first()) throw new HttpError(409, 'A user with this email already exists.');
  await db('users').insert({ name: d.name, email: d.email, password_hash: await bcrypt.hash(d.password, 10), role: d.role });
  res.status(201).json({ ok: true });
});

/* ---------- reviews & questions ---------- */
r.get('/reviews', async (req, res) => res.json({ reviews: await db('reviews').where({ seeded: false }).orderBy('id', 'desc').limit(300) }));
r.put('/reviews/:id', async (req, res) => {
  const d = check(z.object({ status: z.enum(['published', 'hidden']) }), req.body);
  await db('reviews').where({ id: req.params.id }).update({ status: d.status });
  res.json({ ok: true });
});
r.get('/questions', async (req, res) => res.json({ questions: await db('questions').join('products', 'products.id', 'questions.product_id').orderBy('questions.id', 'desc').limit(300).select('questions.*', 'products.name as product_name') }));
r.put('/questions/:id', async (req, res) => {
  const d = check(z.object({ answer: z.string().trim().max(2000).optional(), visible: z.boolean().optional() }), req.body);
  const upd = {};
  if (d.answer !== undefined) { upd.answer = d.answer || null; upd.answered_by = 'Technotri support'; upd.answered_at = sqlNow(); }
  if (d.visible !== undefined) upd.visible = d.visible;
  await db('questions').where({ id: req.params.id }).update(upd);
  res.json({ ok: true });
});

/* ---------- deals, coupons, zones, settings ---------- */
r.get('/deals', async (req, res) => {
  const rows = await db('deals').join('products', 'products.id', 'deals.product_id').where('deals.ends_at', '>', sqlNow()).orderBy('deals.starts_at').orderBy('deals.sort').limit(400)
    .select('deals.*', 'products.name');
  res.json({ deals: rows });
});
r.post('/deals', async (req, res) => {
  const d = check(z.object({ productId: z.string(), pct: z.coerce.number().int().min(1).max(90), startsAt: z.string(), endsAt: z.string() }), req.body);
  const s = new Date(d.startsAt), e = new Date(d.endsAt);
  if (isNaN(s) || isNaN(e) || e <= s) throw new HttpError(400, 'Check the start and end times.');
  const toSql = (x) => x.toISOString().slice(0, 19).replace('T', ' ');
  await db('deals').insert({ product_id: d.productId, pct: d.pct, starts_at: toSql(s), ends_at: toSql(e), sort: 0 });
  res.status(201).json({ ok: true });
});
r.delete('/deals/:id', async (req, res) => { await db('deals').where({ id: req.params.id }).del(); res.json({ ok: true }); });
r.post('/deals/generate', async (req, res) => {
  const flash = await catalog.setting('flash_rotation', []);
  const ids = new Set((await db('products').where({ active: true }).select('id')).map((p) => p.id));
  await db('deals').where('starts_at', '>', sqlNow()).del();
  const rows = dailyDeals(flash, 30, ids).filter((r) => r.ends_at > sqlNow());
  const existing = new Set((await db('deals').where('ends_at', '>', sqlNow()).select('starts_at')).map((x) => String(x.starts_at)));
  const fresh = rows.filter((r) => !existing.has(r.starts_at));
  for (let i = 0; i < fresh.length; i += 100) await db('deals').insert(fresh.slice(i, i + 100));
  res.json({ created: fresh.length });
});

r.get('/coupons', async (req, res) => res.json({ coupons: await db('coupons').orderBy('code') }));
const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,30}$/, 'Codes use 3–30 letters or digits.'), description: z.string().trim().min(3).max(255),
  type: z.enum(['pct', 'catpct', 'ship']), value: z.coerce.number().min(0).max(90).optional(), cap: z.coerce.number().int().min(0).nullable().optional(),
  min_subtotal: z.coerce.number().int().min(0).nullable().optional(), cat_id: z.string().nullable().optional(),
  first_order_only: z.boolean().optional(), active: z.boolean().optional(), expires_at: z.string().nullable().optional()
});
r.post('/coupons', async (req, res) => {
  const d = check(couponSchema, req.body);
  await db('coupons').insert({ ...d, value: d.value || 0, expires_at: d.expires_at ? new Date(d.expires_at).toISOString().slice(0, 19).replace('T', ' ') : null }).onConflict('code').merge();
  res.status(201).json({ ok: true });
});
r.delete('/coupons/:code', async (req, res) => { await db('coupons').where({ code: req.params.code }).del(); res.json({ ok: true }); });

r.get('/zones', async (req, res) => res.json({ zones: await db('zones').orderBy('sort') }));
r.put('/zones/:id', async (req, res) => {
  const d = check(z.object({ name: z.string().trim().min(2).max(160), fee: z.coerce.number().int().min(0), days: z.coerce.number().int().min(0).max(30), free_over: z.coerce.number().int().min(0) }), req.body);
  await db('zones').where({ id: req.params.id }).update(d);
  res.json({ ok: true });
});

r.get('/settings', async (req, res) => res.json({ company: await catalog.setting('company', {}), protection: await catalog.setting('protection', []), flash: await catalog.setting('flash_rotation', null) }));
r.put('/settings', requireAdmin, async (req, res) => {
  const d = check(z.object({ company: z.record(z.string(), z.string().max(500)).optional(), protection: z.array(z.object({ id: z.string().min(1).max(20), name: z.string().trim().min(3).max(120), pct: z.number().min(0).max(1) })).max(6).optional(),
    flash_rotation: z.array(z.tuple([z.string(), z.number().int().min(1).max(90)])).max(60).optional() }), req.body);
  for (const [key, value] of Object.entries(d)) await db('settings').insert({ key, value: toJson(value) }).onConflict('key').merge();
  require('../seo').invalidate();
  res.json({ ok: true });
});

r.get('/newsletter.csv', async (req, res) => {
  const rows = await db('newsletter').orderBy('created_at', 'desc');
  res.type('text/csv').attachment('technotri-newsletter.csv').send(csv(rows, ['email', 'created_at']));
});
r.get('/stock-alerts', async (req, res) => res.json({ alerts: await db('stock_alerts').join('products', 'products.id', 'stock_alerts.product_id').where({ notified: false }).select('stock_alerts.*', 'products.name', 'products.stock') }));

r.get('/me', (req, res) => res.json({ user: publicUser(req.user) }));

/* ---------- order detail for staff (includes internal notes) ---------- */
r.get('/orders/:no/detail', async (req, res) => {
  const o = await db('orders').where({ order_no: req.params.no }).first();
  if (!o) throw new HttpError(404, 'Order not found.');
  const [view, events, customer] = await Promise.all([
    orderView(o.order_no),
    db('order_events').leftJoin('users', 'users.id', 'order_events.by_user').where({ order_id: o.id }).orderBy('order_events.id').select('order_events.*', 'users.name as by_name'),
    o.user_id ? db('users').where({ id: o.user_id }).first('id', 'name', 'phone', 'email', 'dealer_status') : null
  ]);
  res.json({ order: view, events, customer, raw: { notes: o.notes, install: !!o.install, slot: o.slot, pay_status: o.pay_status } });
});

/* ---------- categories ---------- */
const catSchema = z.object({
  id: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,40}$/, 'Use 2–40 lowercase letters, digits or hyphens for the web address.').optional(),
  name: z.string().trim().min(2).max(120), blurb: z.string().trim().max(255).optional().or(z.literal('')),
  subs: z.array(z.string().trim().min(1).max(120)).max(40), pillar: z.enum(['energy', 'power', 'net', 'isp', 'parts']).optional(),
  art: z.string().max(40).optional().or(z.literal('')), dealer_pct: z.coerce.number().min(0).max(0.6), sort: z.coerce.number().int().optional()
});
const catRow = (d) => ({ name: d.name, blurb: d.blurb || null, subs: toJson(d.subs), pillar: d.pillar || null, art: d.art || null, dealer_pct: d.dealer_pct, ...(d.sort !== undefined ? { sort: d.sort } : {}) });
r.get('/categories', async (req, res) => {
  const [rows, counts] = await Promise.all([db('categories').orderBy('sort'), db('products').select('cat_id').count({ n: '*' }).groupBy('cat_id')]);
  const n = new Map(counts.map((c) => [c.cat_id, Number(c.n)]));
  res.json({ categories: rows.map((c) => ({ ...c, subs: fromJson(c.subs, []), facets: fromJson(c.facets, null), dealer_pct: Number(c.dealer_pct), products: n.get(c.id) || 0 })) });
});
r.post('/categories', requireAdmin, async (req, res) => {
  const d = check(catSchema, req.body);
  if (!d.id) throw new HttpError(400, 'Enter the web address (id) for the new category.');
  if (await db('categories').where({ id: d.id }).first()) throw new HttpError(409, 'A category with this address already exists.');
  const max = await db('categories').max({ m: 'sort' }).first();
  await db('categories').insert({ id: d.id, ...catRow(d), sort: d.sort ?? (max.m || 0) + 1 });
  res.status(201).json({ ok: true });
});
r.put('/categories/:id', requireAdmin, async (req, res) => {
  const d = check(catSchema, req.body);
  const n = await db('categories').where({ id: req.params.id }).update(catRow(d));
  if (!n) throw new HttpError(404, 'Category not found.');
  res.json({ ok: true });
});
/* switch a whole category (or one sub-category) between selling online and quotes */
r.put('/categories/:id/mode', async (req, res) => {
  const d = check(z.object({ mode: z.enum(['buy', 'quote', 'quote_price']), sub: z.string().max(120).optional() }), req.body);
  const q = () => { const b = db('products').where({ cat_id: req.params.id }); if (d.sub) b.andWhere({ sub: d.sub }); return b; };
  let skipped = 0;
  if (d.mode === 'buy') skipped = Number((await q().whereNull('price').count({ n: '*' }).first()).n);
  const n = await (d.mode === 'buy' ? q().whereNotNull('price') : q()).update({ quote_only: d.mode !== 'buy', show_price: d.mode === 'quote_price', updated_at: sqlNow() });
  res.json({ updated: n, skipped });
});
r.delete('/categories/:id', requireAdmin, async (req, res) => {
  const used = await db('products').where({ cat_id: req.params.id }).first();
  if (used) throw new HttpError(409, 'Move or delete the products in this category first.');
  await db('categories').where({ id: req.params.id }).del();
  res.json({ ok: true });
});

/* ---------- editable content: guides, kits, FAQ, home slides, site text ---------- */
const id40 = z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,60}$/, 'Use lowercase letters, digits and hyphens for the web address.');
const CONTENT = {
  guides: z.array(z.object({
    id: id40, title: z.string().trim().min(3).max(160), tag: z.string().trim().max(60), art: z.string().max(40).optional(), kind: z.string().trim().max(40),
    mins: z.coerce.number().int().min(1).max(240), level: z.string().trim().max(40), intro: z.string().trim().max(600),
    tools: z.array(z.string().max(200)).optional(), products: z.array(z.string()).max(20),
    sections: z.array(z.object({ h: z.string().max(200), p: z.array(z.string().max(4000)).optional(), table: z.array(z.array(z.string().max(300))).optional() })).optional(),
    steps: z.array(z.object({ t: z.string().max(200), p: z.string().max(4000), tip: z.string().max(1000).optional(), warn: z.string().max(1000).optional() })).optional(),
    active: z.boolean().optional()
  })).max(500),
  kits: z.array(z.object({
    id: id40, name: z.string().trim().min(2).max(160), for: z.string().trim().max(300).optional(), items: z.array(z.string()).min(1).max(200),
    note: z.string().max(600).optional(), extra: z.array(z.string().max(200)).optional(), active: z.boolean().optional()
  })).max(200),
  faq: z.array(z.object({ q: z.string().trim().min(3).max(300), a: z.string().trim().min(1).max(3000), active: z.boolean().optional() })).max(200),
  slides: z.array(z.object({
    kicker: z.string().max(80), title: z.string().trim().min(3).max(160), text: z.string().max(400), art: z.string().max(40),
    pillar: z.enum(['energy', 'power', 'net', 'isp', 'parts']), cta: z.tuple([z.string().max(60), z.string().max(120)]), cta2: z.tuple([z.string().max(60), z.string().max(120)]).optional(),
    active: z.boolean().optional()
  })).max(12),
  site: z.object({
    announcement: z.string().max(160), newsletterTitle: z.string().max(120), newsletterText: z.string().max(240),
    bankName: z.string().max(120), bankAccountName: z.string().max(160), bankAccountNo: z.string().max(60), bankBranch: z.string().max(120),
    returnDays: z.string().max(4), homeTitle: z.string().max(120), homeDescription: z.string().max(300)
  }).partial()
};
r.get('/content/:key', async (req, res) => {
  if (!CONTENT[req.params.key]) throw new HttpError(404, 'Unknown content.');
  res.json({ value: await catalog.setting(req.params.key, req.params.key === 'site' ? {} : []) });
});
r.put('/content/:key', async (req, res) => {
  const schema = CONTENT[req.params.key];
  if (!schema) throw new HttpError(404, 'Unknown content.');
  let value = check(schema, req.body.value);
  if (req.params.key === 'site') value = { ...(await catalog.setting('site', {})), ...value };
  if (Array.isArray(value) && value.length && value[0].id) {
    const ids = value.map((x) => x.id);
    const dup = ids.find((x, i) => ids.indexOf(x) !== i);
    if (dup) throw new HttpError(400, `Two entries use the same web address: ${dup}.`);
  }
  await db('settings').insert({ key: req.params.key, value: toJson(value) }).onConflict('key').merge();
  require('../seo').invalidate();
  res.json({ value });
});

/* ---------- coupons (edit / switch on and off), zones (add / remove) ---------- */
r.put('/coupons/:code', async (req, res) => {
  const d = check(couponSchema.partial().omit({ code: true }), req.body);
  if (d.expires_at !== undefined) d.expires_at = d.expires_at ? new Date(d.expires_at).toISOString().slice(0, 19).replace('T', ' ') : null;
  const n = await db('coupons').where({ code: req.params.code }).update(d);
  if (!n) throw new HttpError(404, 'Coupon not found.');
  res.json({ ok: true });
});
r.post('/zones', requireAdmin, async (req, res) => {
  const d = check(z.object({ id: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,20}$/, 'Use 2–20 lowercase letters or digits for the zone code.'), name: z.string().trim().min(2).max(160), fee: z.coerce.number().int().min(0), days: z.coerce.number().int().min(0).max(30), free_over: z.coerce.number().int().min(0) }), req.body);
  if (await db('zones').where({ id: d.id }).first()) throw new HttpError(409, 'A zone with this code already exists.');
  const max = await db('zones').max({ m: 'sort' }).first();
  await db('zones').insert({ ...d, sort: (max.m || 0) + 1 });
  res.status(201).json({ ok: true });
});
r.delete('/zones/:id', requireAdmin, async (req, res) => {
  if ((await db('zones').count({ n: '*' }).first()).n <= 1) throw new HttpError(409, 'Keep at least one delivery zone.');
  await db('zones').where({ id: req.params.id }).del();
  res.json({ ok: true });
});

/* ---------- customers: detail and password reset ---------- */
r.get('/customers/:id', async (req, res) => {
  const u = await db('users').where({ id: req.params.id }).first('id', 'name', 'phone', 'email', 'pan', 'role', 'dealer_status', 'active', 'created_at', 'last_login_at');
  if (!u) throw new HttpError(404, 'Customer not found.');
  const [orders, addresses, dealer] = await Promise.all([
    db('orders').where({ user_id: u.id }).orderBy('id', 'desc').select('order_no', 'total', 'status', 'created_at'),
    db('addresses').where({ user_id: u.id }), db('dealer_applications').where({ user_id: u.id }).orderBy('id', 'desc').first()
  ]);
  res.json({ customer: u, orders, addresses, dealer });
});
r.put('/customers/:id/password', requireAdmin, async (req, res) => {
  const d = check(z.object({ password: z.string().min(8, 'Use at least 8 characters.').max(200) }), req.body);
  const n = await db('users').where({ id: req.params.id }).update({ password_hash: await bcrypt.hash(d.password, 10) });
  if (!n) throw new HttpError(404, 'Customer not found.');
  res.json({ ok: true });
});
r.put('/customers/:id/dealer', async (req, res) => {
  const d = check(z.object({ status: z.enum(['none', 'approved', 'rejected']) }), req.body);
  await db('users').where({ id: req.params.id }).update({ dealer_status: d.status });
  res.json({ ok: true });
});

/* ---------- moderation: delete ---------- */
r.delete('/reviews/:id', async (req, res) => { await db('reviews').where({ id: req.params.id }).del(); res.json({ ok: true }); });
r.delete('/questions/:id', async (req, res) => { await db('questions').where({ id: req.params.id }).del(); res.json({ ok: true }); });

/* ---------- marketing lists ---------- */
r.get('/newsletter', async (req, res) => res.json({ subscribers: await db('newsletter').orderBy('created_at', 'desc').limit(5000) }));
r.delete('/newsletter/:email', async (req, res) => { await db('newsletter').where({ email: req.params.email }).del(); res.json({ ok: true }); });
r.put('/stock-alerts/:id', async (req, res) => { await db('stock_alerts').where({ id: req.params.id }).update({ notified: true }); res.json({ ok: true }); });

/* ---------- products: spreadsheet export and bulk price/stock update ---------- */
const PCOLS = ['id', 'name', 'brand', 'model', 'cat_id', 'sub', 'mode', 'price', 'mrp', 'stock', 'active', 'warranty'];
const modeOf = (x) => (!x.quote_only ? 'buy' : x.show_price ? 'quote_price' : 'quote');
r.get('/products.csv', async (req, res) => {
  const rows = await db('products').orderBy('sort').select(PCOLS.filter((c) => c !== 'mode').concat(['quote_only', 'show_price']));
  res.type('text/csv').attachment('technotri-products.csv').send(csv(rows.map((x) => ({ ...x, mode: modeOf(x), active: x.active ? 1 : 0 })), PCOLS));
});
function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r0) => r0.some((c) => c.trim() !== ''));
}
r.post('/products/import', express.text({ type: ['text/csv', 'text/plain'], limit: '2mb' }), async (req, res) => {
  const rows = parseCsv(String(req.body || '').replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw new HttpError(400, 'The file is empty. Export the product list first, edit it, then import it.');
  const head = rows[0].map((h) => h.trim().toLowerCase());
  if (!head.includes('id')) throw new HttpError(400, 'The first row must contain an "id" column.');
  const col = (r0, k) => { const i = head.indexOf(k); return i < 0 ? undefined : (r0[i] ?? '').trim(); };
  const num = (v) => (v === undefined ? undefined : v === '' ? null : Number(String(v).replace(/[^0-9.]/g, '')));
  let updated = 0; const missing = [], skipped = [];
  await db.transaction(async (trx) => {
    for (const r0 of rows.slice(1)) {
      const id = col(r0, 'id'); if (!id) continue;
      const upd = {};
      for (const k of ['name', 'brand', 'model', 'sub', 'warranty']) { const v = col(r0, k); if (v !== undefined && v !== '') upd[k] = v; }
      const cat = col(r0, 'cat_id'); if (cat) upd.cat_id = cat;
      const price = num(col(r0, 'price')); if (price !== undefined) upd.price = price;
      const mode = (col(r0, 'mode') || '').toLowerCase().replace(/[\s-]+/g, '_');
      if (['buy', 'quote', 'quote_price'].includes(mode)) { upd.quote_only = mode !== 'buy'; upd.show_price = mode === 'quote_price'; }
      else if (price === null) upd.quote_only = true;
      if (upd.quote_only === false && (upd.price === null || (upd.price === undefined && (await trx('products').where({ id }).first('price') || {}).price == null))) { skipped.push(id); continue; }
      const mrp = num(col(r0, 'mrp')); if (mrp !== undefined) upd.mrp = mrp;
      const stock = num(col(r0, 'stock')); if (stock !== undefined && stock !== null) upd.stock = Math.max(0, Math.round(stock));
      const act = col(r0, 'active'); if (act !== undefined && act !== '') upd.active = /^(1|yes|true|y)$/i.test(act);
      if (!Object.keys(upd).length) continue;
      upd.updated_at = sqlNow();
      const n = await trx('products').where({ id }).update(upd);
      if (n) updated++; else missing.push(id);
    }
  });
  res.json({ updated, missing, skipped });
});

module.exports = r;
