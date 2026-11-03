'use strict';
/* Loads the starter catalog (server/data/catalog-data.js) into an empty database.
   Safe to re-run: it does nothing if categories already exist, unless SEED_FORCE=true. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const bcrypt = require('bcryptjs');
const config = require('../config');

function loadCatalog() {
  const code = fs.readFileSync(path.join(__dirname, '..', 'data', 'catalog-data.js'), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox);
  return sandbox.window.TT_DATA;
}

const j = (v) => (v === undefined || v === null ? null : JSON.stringify(v));
const NPT_MS = (5 * 60 + 45) * 60 * 1000;
const sqlTime = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');

/** Daily flash deals: each Nepal day gets 6 products from the rotation list, ending at Nepal midnight. */
function dailyDeals(flash, days, productIds) {
  const list = flash.filter(([id]) => productIds.has(id));
  const rows = [];
  const todayNpt = Math.floor((Date.now() + NPT_MS) / 864e5);
  for (let d = 0; d < days; d++) {
    const day = todayNpt + d;
    const start = day * 864e5 - NPT_MS;
    for (let i = 0; i < Math.min(6, list.length); i++) {
      const [id, pct] = list[(day + i) % list.length];
      rows.push({ product_id: id, pct, starts_at: sqlTime(start), ends_at: sqlTime(start + 864e5), sort: i });
    }
  }
  return rows;
}

exports.loadCatalog = loadCatalog;
exports.dailyDeals = dailyDeals;
exports.ensureAdmin = (knex) => ensureAdmin(knex);

exports.seed = async function (knex) {
  const force = process.env.SEED_FORCE === 'true';
  const existing = await knex('categories').count({ n: '*' }).first();
  if (Number(existing.n) > 0 && !force) {
    console.log('Catalog already present; skipping (set SEED_FORCE=true to reload it).');
    return ensureAdmin(knex);
  }
  const D = loadCatalog();
  if (force) {
    for (const t of ['deals', 'questions', 'reviews', 'product_images', 'products', 'categories', 'coupons', 'zones']) await knex(t).del();
  }

  await knex('categories').insert(D.CATS.map((c, i) => ({
    id: c.id, name: c.name, pillar: c.pillar || '', art: c.art, blurb: c.blurb,
    subs: j(c.subs), facets: j(c.facets), dealer_pct: c.dealer, sort: i
  })));

  await knex('products').insert(D.PRODUCTS.map((p, i) => ({
    id: p.id, cat_id: p.cat, sub: p.sub, brand: p.brand, model: p.model || null, name: p.name, art: p.art,
    price: p.price ?? null, mrp: p.mrp ?? p.price ?? null, quote_only: !!p.quote, stock: p.stock ?? 0,
    tags: j(p.tags || []), highlights: j(p.hl || []), specs: j(p.specs || {}), builder: j(p.bld || null), lab: j(p.lab || null),
    serviceability: p.serv ?? null, warranty: p.warranty || null,
    rating_base_avg: (p.rating || [0, 0])[0], rating_base_count: (p.rating || [0, 0])[1],
    breaks: j(p.breaks || null), fbt: j(p.fbt || []), active: true, sort: i
  })));

  await knex('zones').insert(D.ZONES.map((z, i) => ({ id: z.id, name: z.name, fee: z.fee, days: z.days, free_over: z.free, sort: i })));

  await knex('coupons').insert(D.COUPONS.map((c) => ({
    code: c.code, description: c.desc, type: c.type, value: c.v || 0, cap: c.cap ?? null, min_subtotal: c.min ?? null,
    cat_id: c.cat || null, first_order_only: c.code === 'WELCOME5', active: true
  })));

  // Seed reviews are scaled into rating_base_*; written ones are stored so they can be moderated.
  const reviews = [];
  for (const [pid, list] of Object.entries(D.REVIEWS)) {
    for (const r of list) reviews.push({ product_id: pid, name: r.n, stars: r.s, title: r.title, body: r.t, verified: !!r.v, seeded: true, status: 'published', review_date: r.d });
  }
  if (reviews.length) await knex('reviews').insert(reviews);

  const questions = [];
  for (const [pid, list] of Object.entries(D.QA)) {
    for (const q of list) questions.push({ product_id: pid, question: q.q, answer: q.a, answered_by: q.by || 'Technotri support', answered_at: sqlTime(Date.now()), visible: true });
  }
  if (questions.length) await knex('questions').insert(questions);

  const ids = new Set(D.PRODUCTS.map((p) => p.id));
  const deals = dailyDeals(D.FLASH, 30, ids);
  for (let i = 0; i < deals.length; i += 100) await knex('deals').insert(deals.slice(i, i + 100));

  await knex('settings').del();
  await knex('settings').insert([
    { key: 'company', value: j(D.COMPANY) },
    { key: 'protection', value: j(D.PROTECT) },
    { key: 'flash_rotation', value: j(D.FLASH) }
  ]);

  console.log(`Seeded ${D.CATS.length} categories, ${D.PRODUCTS.length} products, ${deals.length} deal slots.`);
  await ensureAdmin(knex);
};

async function ensureAdmin(knex) {
  const { email, password, name } = config.admin;
  if (!email || !password) return;
  const found = await knex('users').where({ email: email.toLowerCase() }).first();
  if (!found) {
    await knex('users').insert({ name, email: email.toLowerCase(), password_hash: await bcrypt.hash(password, 10), role: 'admin', email_verified_at: knex.fn.now() });
    console.log(`Created admin account ${email}.`);
    return;
  }
  // ADMIN_EMAIL / ADMIN_PASSWORD are the source of truth: changing them and restarting resets the admin login.
  const upd = {};
  if (found.role !== 'admin') upd.role = 'admin';
  if (!found.active) upd.active = true;
  if (!found.password_hash || !(await bcrypt.compare(password, found.password_hash))) upd.password_hash = await bcrypt.hash(password, 10);
  if (Object.keys(upd).length) { await knex('users').where({ id: found.id }).update(upd); console.log(`Updated admin account ${email} (${Object.keys(upd).join(', ').replace('password_hash', 'password')}).`); }
}
