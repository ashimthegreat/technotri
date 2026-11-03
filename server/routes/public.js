'use strict';
const express = require('express');
const config = require('../config');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const { db, toJson, fromJson } = require('../db');
const catalog = require('../catalog');
const { publicUser } = require('../auth');
const { totals, etaLabel } = require('../pricing');
const mailer = require('../mailer');
const { check, PHONE, cleanPhone, HttpError, docNumber, sqlNow } = require('../util');

const r = express.Router();
const formLimiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Try again in a few minutes.' } });
const phoneField = z.string().transform(cleanPhone).refine((p) => PHONE.test(p), 'Enter a 10-digit mobile number starting with 96, 97 or 98.');

async function userExtras(u) {
  if (!u) return null;
  const [cnt, addresses] = await Promise.all([
    db('orders').where({ user_id: u.id }).whereNot({ status: 'cancelled' }).count({ n: '*' }).first(),
    db('addresses').where({ user_id: u.id }).orderBy('id', 'desc')
  ]);
  return publicUser(u, { orderCount: Number(cnt.n), addresses: addresses.map((a) => ({ id: a.id, city: a.city, ward: a.ward, street: a.street })) });
}

/* ---------- catalog bootstrap ---------- */
r.get('/bootstrap', async (req, res) => {
  const [categories, products, zones, coupons, deals, company, protection, user, guides, kits, faq, slides, site] = await Promise.all([
    catalog.categories(), catalog.listProducts(), db('zones').orderBy('sort'),
    db('coupons').where({ active: true }).andWhere((q) => q.whereNull('expires_at').orWhere('expires_at', '>', sqlNow())),
    catalog.activeDeals(), catalog.setting('company', {}), catalog.setting('protection', []), userExtras(req.user),
    catalog.setting('guides', []), catalog.setting('kits', []), catalog.setting('faq', []), catalog.setting('slides', []), catalog.setting('site', {})
  ]);
  res.set('Cache-Control', 'no-store');
  const live = (list) => list.filter((x) => x.active !== false);
  res.json({
    company, categories, products, deals, protection, user,
    auth: { google: !!(config.oauth.google.id && config.oauth.google.secret), facebook: !!(config.oauth.facebook.id && config.oauth.facebook.secret), email: require('../mailer').enabled },
    guides: live(guides), kits: live(kits), faq: live(faq), slides: live(slides),
    site: { announcement: site.announcement || '', newsletterTitle: site.newsletterTitle || '', newsletterText: site.newsletterText || '', returnDays: site.returnDays || '7',
      bank: site.bankAccountNo ? { name: site.bankName, accountName: site.bankAccountName, accountNo: site.bankAccountNo, branch: site.bankBranch } : null },
    zones: zones.map((z) => ({ id: z.id, name: z.name, fee: z.fee, days: z.days, free: z.free_over })),
    coupons: coupons.map((c) => ({ code: c.code, desc: c.description, type: c.type, v: Number(c.value), cap: c.cap, min: c.min_subtotal, cat: c.cat_id, first: !!c.first_order_only }))
  });
});

/* ---------- reviews & questions ---------- */
function syntheticDist(avg, count) {
  const w = [1, 2, 3, 4, 5].map((s) => Math.exp(-((s - avg) ** 2) / (2 * 0.85 ** 2)));
  const sw = w.reduce((a, b) => a + b, 0);
  return w.map((x) => Math.round((x / sw) * count));
}

r.get('/products/:id/extras', async (req, res) => {
  const p = await db('products').where({ id: req.params.id }).first();
  if (!p) throw new HttpError(404, 'Product not found.');
  const [reviews, questions, own] = await Promise.all([
    db('reviews').where({ product_id: p.id, status: 'published' }).orderBy('review_date', 'desc').orderBy('id', 'desc').limit(200),
    db('questions').where({ product_id: p.id, visible: true }).orderBy('id', 'desc').limit(100),
    db('reviews').where({ product_id: p.id, status: 'published', seeded: false }).select('stars')
  ]);
  const dist = syntheticDist(Number(p.rating_base_avg), p.rating_base_count);
  own.forEach((x) => dist[x.stars - 1]++);
  res.json({
    dist,
    reviews: reviews.map((x) => ({ n: x.name, s: x.stars, title: x.title, t: x.body, d: String(x.review_date).slice(0, 10), v: !!x.verified })),
    questions: questions.map((q) => ({ q: q.question, a: q.answer, by: q.answered_by }))
  });
});

const reviewSchema = z.object({ name: z.string().trim().min(2, 'Enter your name.').max(120), stars: z.coerce.number().int().min(1).max(5), title: z.string().trim().min(2, 'Add a title.').max(120), body: z.string().trim().min(10, 'Write at least a sentence.').max(2000) });
r.post('/products/:id/reviews', formLimiter, async (req, res) => {
  const d = check(reviewSchema, req.body);
  const p = await db('products').where({ id: req.params.id, active: true }).first();
  if (!p) throw new HttpError(404, 'Product not found.');
  let verified = false;
  if (req.user) {
    verified = !!(await db('order_items').join('orders', 'orders.id', 'order_items.order_id')
      .where({ 'orders.user_id': req.user.id, 'order_items.product_id': p.id }).whereNot('orders.status', 'cancelled').first());
  }
  await db('reviews').insert({ product_id: p.id, user_id: req.user ? req.user.id : null, name: d.name, stars: d.stars, title: d.title, body: d.body, verified, status: 'published', review_date: sqlNow().slice(0, 10) });
  res.status(201).json({ ok: true, verified });
});

r.post('/products/:id/questions', formLimiter, async (req, res) => {
  const d = check(z.object({ question: z.string().trim().min(5, 'Write a slightly longer question.').max(1000) }), req.body);
  const p = await db('products').where({ id: req.params.id, active: true }).first();
  if (!p) throw new HttpError(404, 'Product not found.');
  await db('questions').insert({ product_id: p.id, user_id: req.user ? req.user.id : null, question: d.question, visible: true });
  res.status(201).json({ ok: true });
});

/* ---------- newsletter & stock alerts ---------- */
r.post('/newsletter', formLimiter, async (req, res) => {
  const d = check(z.object({ email: z.string().trim().toLowerCase().email('Enter a valid email address.') }), req.body);
  await db('newsletter').insert({ email: d.email }).onConflict('email').ignore();
  res.status(201).json({ ok: true });
});
r.post('/stock-alerts', formLimiter, async (req, res) => {
  const d = check(z.object({ productId: z.string().min(1), contact: z.string().trim().min(5, 'Enter a mobile number or email.').max(190) }), req.body);
  await db('stock_alerts').insert({ product_id: d.productId, contact: d.contact });
  res.status(201).json({ ok: true });
});

/* ---------- checkout ---------- */
const itemsSchema = z.array(z.object({ id: z.string().min(1), qty: z.coerce.number().int().min(1).max(999), prot: z.string().nullable().optional() })).min(1, 'Your cart is empty.').max(100);

async function pricingContext({ zoneId, pickup, code, user }) {
  const [zone, cats, deals, protection, coupon, prior] = await Promise.all([
    db('zones').where({ id: zoneId }).first(), db('categories'), catalog.activeDeals(), catalog.setting('protection', []),
    code ? db('coupons').where({ code: String(code).toUpperCase() }).first() : null,
    user ? db('orders').where({ user_id: user.id }).whereNot({ status: 'cancelled' }).count({ n: '*' }).first() : { n: 0 }
  ]);
  if (!zone) throw new HttpError(400, 'Choose a delivery area.');
  if (code && !coupon) throw new HttpError(400, 'That coupon code is not valid.');
  return {
    zone, pickup: !!pickup, coupon, protection, priorOrders: Number(prior.n),
    dealer: !!(user && user.dealer_status === 'approved'),
    deals: new Map(deals.map(([id, pct]) => [id, pct])), categories: new Map(cats.map((c) => [c.id, c]))
  };
}

async function loadLines(items, trx = db) {
  const ids = [...new Set(items.map((i) => i.id))];
  const rows = await trx('products').whereIn('id', ids).andWhere({ active: true });
  const map = new Map(rows.map((p) => [p.id, catalog.forPricing(p)]));
  return items.map((i) => {
    const p = map.get(i.id);
    if (!p) throw new HttpError(400, 'An item in your cart is no longer available. Remove it and try again.');
    if (p.quote_only || p.price == null) throw new HttpError(400, `${p.name} is sold by quotation. Move it to a quote request.`);
    return { product: p, qty: i.qty, prot: i.prot || null };
  });
}

r.post('/checkout/preview', async (req, res) => {
  const d = check(z.object({ items: itemsSchema, zone: z.string(), pickup: z.boolean().optional(), coupon: z.string().optional().nullable() }), req.body);
  const ctx = await pricingContext({ zoneId: d.zone, pickup: d.pickup, code: d.coupon, user: req.user });
  const t = totals(await loadLines(d.items), ctx);
  res.json({ items: t.items, protection: t.protection, discount: t.discount, shipping: t.shipping, total: t.total, vat: t.vat, coupon: t.coupon, couponMessage: t.couponMessage });
});

const orderSchema = z.object({
  items: itemsSchema,
  coupon: z.string().max(30).optional().nullable(),
  zone: z.string().min(1),
  info: z.object({
    name: z.string().trim().min(2, 'Enter your full name.').max(120),
    phone: phoneField,
    email: z.string().trim().toLowerCase().email('Check the email address.').max(190).optional().or(z.literal('')),
    pan: z.string().trim().max(20).optional().or(z.literal('')),
    method: z.enum(['ship', 'pickup']),
    city: z.string().trim().max(120).optional().or(z.literal('')),
    ward: z.string().trim().max(120).optional().or(z.literal('')),
    street: z.string().trim().max(255).optional().or(z.literal('')),
    slot: z.string().max(60).optional().or(z.literal('')),
    install: z.boolean().optional(),
    notes: z.string().max(1000).optional().or(z.literal('')),
    pay: z.enum(['cod', 'bank'])
  })
});

r.post('/orders', formLimiter, async (req, res) => {
  const d = check(orderSchema, req.body);
  const info = d.info;
  if (info.method === 'ship' && (!info.city || !info.street)) throw new HttpError(400, 'Enter your city and street or landmark.');
  const ctx = await pricingContext({ zoneId: d.zone, pickup: info.method === 'pickup', code: d.coupon, user: req.user });

  const order = await db.transaction(async (trx) => {
    const lines = await loadLines(d.items, trx);
    // lock stock rows and check availability
    const ids = [...new Set(lines.map((l) => l.product.id))];
    const stockRows = await trx('products').whereIn('id', ids).forUpdate().select('id', 'stock', 'name');
    const stock = new Map(stockRows.map((s) => [s.id, s]));
    const need = new Map();
    lines.forEach((l) => need.set(l.product.id, (need.get(l.product.id) || 0) + l.qty));
    for (const [id, q] of need) {
      const s = stock.get(id);
      if (s.stock < q) throw new HttpError(409, s.stock > 0 ? `Only ${s.stock} of ${s.name} left. Lower the quantity and try again.` : `${s.name} just went out of stock. Remove it to continue.`);
    }
    const t = totals(lines, ctx);
    let orderNo;
    for (let i = 0; i < 5; i++) { orderNo = docNumber('TT'); if (!(await trx('orders').where({ order_no: orderNo }).first())) break; }
    const row = {
      order_no: orderNo, user_id: req.user ? req.user.id : null, name: info.name, phone: info.phone, email: info.email || null, pan: info.pan || null,
      method: info.method, zone_id: ctx.zone.id, zone_name: ctx.zone.name, city: info.city || null, ward: info.ward || null, street: info.street || null,
      slot: info.slot || null, install: !!info.install, notes: info.notes || null, pay_method: info.pay,
      pay_status: info.pay === 'cod' ? 'cash on delivery' : 'awaiting transfer', status: 'placed',
      items_total: t.items, protection: t.protection, discount: t.discount, coupon: t.coupon, shipping: t.shipping, total: t.total,
      taxable: t.taxable, vat: t.vat, eta: info.method === 'pickup' ? 'Ready in 2 hours' : etaLabel(ctx.zone.days)
    };
    const [orderId] = await trx('orders').insert(row);
    const items = t.lines.map((l) => ({ order_id: orderId, product_id: l.product.id, name: l.product.name, model: l.product.model, qty: l.qty, unit: l.unit, protection_name: l.plan ? l.plan.name : null, protection_amt: l.protAmt }));
    await trx('order_items').insert(items);
    await trx('order_events').insert({ order_id: orderId, status: 'placed' });
    for (const [id, q] of need) await trx('products').where({ id }).decrement('stock', q);
    if (req.user && info.method === 'ship') {
      const same = await trx('addresses').where({ user_id: req.user.id, street: info.street }).first();
      if (!same) await trx('addresses').insert({ user_id: req.user.id, city: info.city, ward: info.ward || null, street: info.street });
      if (info.pan && !req.user.pan) await trx('users').where({ id: req.user.id }).update({ pan: info.pan });
    }
    return { ...row, items };
  });
  mailer.orderPlaced(order, order.items);
  res.status(201).json({ order: await orderView(order.order_no) });
});

async function orderView(no) {
  const o = await db('orders').where({ order_no: no }).first();
  if (!o) return null;
  const [items, events] = await Promise.all([db('order_items').where({ order_id: o.id }), db('order_events').where({ order_id: o.id, kind: 'status' }).orderBy('id')]);
  const view = {
    no: o.order_no, t: Date.parse(o.created_at.replace(' ', 'T') + 'Z'), status: o.status, eta: o.eta, zone: o.zone_name,
    info: { name: o.name, phone: o.phone, email: o.email, pan: o.pan, method: o.method, city: o.city, ward: o.ward, street: o.street, slot: o.slot, install: !!o.install, notes: o.notes, pay: o.pay_method },
    pay: { method: o.pay_method, status: o.pay_status },
    items: items.map((i) => ({ id: i.product_id, name: i.name, model: i.model, qty: i.qty, unit: i.unit, prot: i.protection_name, protAmt: i.protection_amt })),
    items_total: o.items_total, prot: o.protection, disc: o.discount, coupon: o.coupon, ship: o.shipping, total: o.total, taxable: Number(o.taxable), vat: Number(o.vat),
    history: events.map((e) => ({ s: e.status, t: Date.parse(e.created_at.replace(' ', 'T') + 'Z'), note: e.note }))
  };
  Object.defineProperty(view, 'uid', { value: o.user_id, enumerable: false }); // kept out of the JSON sent to browsers
  return view;
}

function canSee(req, o, phone) {
  if (!o) return false;
  if (req.user && (req.user.role !== 'customer' || (o.uid && o.uid === req.user.id) || (req.user.phone && req.user.phone === o.info.phone))) return true;
  return phone && cleanPhone(phone) === o.info.phone;
}

r.get('/orders/:no', async (req, res) => {
  const o = await orderView(String(req.params.no).toUpperCase());
  if (!canSee(req, o, req.query.phone)) throw new HttpError(404, 'No order matches that number and mobile.');
  res.json({ order: o });
});

r.post('/track', formLimiter, async (req, res) => {
  const d = check(z.object({ no: z.string().trim().toUpperCase(), phone: phoneField }), req.body);
  const o = await orderView(d.no);
  if (!o || o.info.phone !== d.phone) throw new HttpError(404, 'No order matches that number and mobile. Check both and try again, or call us.');
  res.json({ order: o });
});

r.post('/orders/:no/cancel', formLimiter, async (req, res) => {
  const o = await orderView(String(req.params.no).toUpperCase());
  if (!canSee(req, o, req.body && req.body.phone)) throw new HttpError(404, 'Order not found.');
  if (!['placed', 'confirmed'].includes(o.status)) throw new HttpError(409, 'This order is already being prepared. Call us to cancel it.');
  await db.transaction(async (trx) => {
    const row = await trx('orders').where({ order_no: o.no }).forUpdate().first();
    if (!['placed', 'confirmed'].includes(row.status)) throw new HttpError(409, 'This order is already being prepared.');
    await trx('orders').where({ id: row.id }).update({ status: 'cancelled' });
    await trx('order_events').insert({ order_id: row.id, status: 'cancelled', note: 'Cancelled by customer', by_user: req.user ? req.user.id : null });
    for (const i of o.items) if (i.id) await trx('products').where({ id: i.id }).increment('stock', i.qty);
  });
  res.json({ order: await orderView(o.no) });
});

/* ---------- quotes & service ---------- */
const quoteSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(120), org: z.string().trim().max(160).optional().or(z.literal('')),
  phone: phoneField, email: z.string().trim().email('Check the email address.').optional().or(z.literal('')),
  type: z.string().max(80).optional(), location: z.string().max(160).optional().or(z.literal('')),
  requirements: z.string().max(4000).optional().or(z.literal('')), siteVisit: z.boolean().optional(),
  items: z.array(z.object({ id: z.string(), qty: z.coerce.number().int().min(1).max(100000) })).max(200).optional()
});
r.post('/quotes', formLimiter, async (req, res) => {
  const d = check(quoteSchema, req.body);
  if (!(d.items && d.items.length) && !d.requirements) throw new HttpError(400, 'Add items or describe what you need.');
  const names = d.items && d.items.length ? new Map((await db('products').whereIn('id', d.items.map((i) => i.id)).select('id', 'name')).map((p) => [p.id, p.name])) : new Map();
  const quote_no = docNumber('TQ');
  const row = { quote_no, user_id: req.user ? req.user.id : null, name: d.name, org: d.org || null, phone: d.phone, email: d.email || null, type: d.type || null, location: d.location || null, requirements: d.requirements || null, site_visit: !!d.siteVisit, items: toJson((d.items || []).map((i) => ({ ...i, name: names.get(i.id) || i.id }))), status: 'new' };
  await db('quotes').insert(row);
  mailer.quoteReceived(row);
  res.status(201).json({ no: quote_no });
});

r.post('/service-requests', formLimiter, async (req, res) => {
  const d = check(z.object({ order: z.string().max(24).optional().or(z.literal('')), serial: z.string().trim().min(2, 'Enter the serial number.').max(120), name: z.string().trim().min(2, 'Enter your name.').max(120), phone: phoneField, issue: z.string().trim().min(5, 'Describe the problem.').max(2000) }), req.body);
  const request_no = docNumber('SR');
  await db('service_requests').insert({ request_no, order_no: d.order || null, serial: d.serial, name: d.name, phone: d.phone, issue: d.issue });
  res.status(201).json({ no: request_no });
});

module.exports = { router: r, orderView, userExtras };
