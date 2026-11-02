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
r.get('/products', async (req, res) => res.json({ products: await catalog.listProducts({ includeInactive: true }) }));

const productSchema = z.object({
  name: z.string().trim().min(2).max(255), brand: z.string().trim().min(1).max(120), model: z.string().trim().max(120).optional().or(z.literal('')),
  cat: z.string().min(1), sub: z.string().min(1).max(120), art: z.string().max(40).optional(),
  price: z.coerce.number().int().min(0).nullable().optional(), mrp: z.coerce.number().int().min(0).nullable().optional(),
  quote: z.boolean().optional(), stock: z.coerce.number().int().min(0).max(1000000).optional(),
  tags: z.array(z.string().max(20)).max(10).optional(), hl: z.array(z.string().max(300)).max(12).optional(),
  specs: z.record(z.string(), z.string().max(300)).optional(), warranty: z.string().max(120).optional().or(z.literal('')),
  breaks: z.array(z.tuple([z.number().int().min(1), z.number().int().min(0)])).max(10).nullable().optional(),
  fbt: z.array(z.string()).max(8).optional(), active: z.boolean().optional()
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
  if (d.stock !== undefined) row.stock = d.stock;
  if (d.tags !== undefined) row.tags = toJson(d.tags);
  if (d.hl !== undefined) row.highlights = toJson(d.hl);
  if (d.specs !== undefined) row.specs = toJson(d.specs);
  if (d.warranty !== undefined) row.warranty = d.warranty || null;
  if (d.breaks !== undefined) row.breaks = toJson(d.breaks);
  if (d.fbt !== undefined) row.fbt = toJson(d.fbt);
  if (d.active !== undefined) row.active = d.active;
  return row;
}
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

r.post('/products', async (req, res) => {
  const d = check(productSchema, req.body);
  if (!(await db('categories').where({ id: d.cat }).first())) throw new HttpError(400, 'Choose a valid category.');
  let id = slugify(d.model || d.name) || 'item';
  if (await db('products').where({ id }).first()) id = `${id}-${crypto.randomInt(100, 999)}`;
  const row = { id, ...productRow(d), quote_only: d.quote ?? d.price == null, mrp: d.mrp ?? d.price ?? null, tags: toJson(d.tags || ['new']), highlights: toJson(d.hl || []), specs: toJson(d.specs || {}), fbt: toJson(d.fbt || []), stock: d.stock || 0, sort: -1 };
  await db('products').insert(row);
  res.status(201).json({ product: await catalog.getProduct(id) });
});

r.put('/products/:id', async (req, res) => {
  const d = check(productSchema.partial(), req.body);
  const before = await db('products').where({ id: req.params.id }).first();
  if (!before) throw new HttpError(404, 'Product not found.');
  const row = productRow(d);
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
  const d = check(z.object({ status: z.enum(STATUSES).optional(), payStatus: z.string().max(40).optional(), note: z.string().max(255).optional() }), req.body);
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
    if (d.payStatus) upd.pay_status = d.payStatus;
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

r.get('/settings', async (req, res) => res.json({ company: await catalog.setting('company', {}), protection: await catalog.setting('protection', []) }));
r.put('/settings', requireAdmin, async (req, res) => {
  const d = check(z.object({ company: z.record(z.string(), z.string().max(500)).optional(), protection: z.array(z.object({ id: z.string(), name: z.string(), pct: z.number().min(0).max(1) })).optional() }), req.body);
  for (const [key, value] of Object.entries(d)) await db('settings').insert({ key, value: toJson(value) }).onConflict('key').merge();
  res.json({ ok: true });
});

r.get('/newsletter.csv', async (req, res) => {
  const rows = await db('newsletter').orderBy('created_at', 'desc');
  res.type('text/csv').attachment('technotri-newsletter.csv').send(csv(rows, ['email', 'created_at']));
});
r.get('/stock-alerts', async (req, res) => res.json({ alerts: await db('stock_alerts').join('products', 'products.id', 'stock_alerts.product_id').where({ notified: false }).select('stock_alerts.*', 'products.name', 'products.stock') }));

r.get('/me', (req, res) => res.json({ user: publicUser(req.user) }));

module.exports = r;
