'use strict';
const { db, fromJson } = require('./db');

/** Map a products row to the shape the storefront uses. */
function toPublic(row, rating, images) {
  return {
    id: row.id, cat: row.cat_id, sub: row.sub, brand: row.brand, model: row.model, name: row.name, art: row.art,
    price: row.price, mrp: row.mrp, quote: !!row.quote_only, stock: row.stock,
    tags: fromJson(row.tags, []), hl: fromJson(row.highlights, []), specs: fromJson(row.specs, {}),
    bld: fromJson(row.builder, null), lab: fromJson(row.lab, null),
    serv: row.serviceability == null ? null : Number(row.serviceability), warranty: row.warranty,
    rating: rating || [Number(row.rating_base_avg), row.rating_base_count],
    breaks: fromJson(row.breaks, null), fbt: fromJson(row.fbt, []), images: images || [], active: !!row.active
  };
}

/** Product row with parsed JSON, for pricing. */
function forPricing(row) {
  return { ...row, quote_only: !!row.quote_only, breaks: fromJson(row.breaks, null) };
}

async function ratingsMap(productIds) {
  // Seed ratings are a base; customer reviews (not the seeded written ones) add to it.
  const q = db('reviews').where({ status: 'published', seeded: false }).select('product_id').count({ n: '*' }).sum({ s: 'stars' }).groupBy('product_id');
  if (productIds) q.whereIn('product_id', productIds);
  const rows = await q;
  return new Map(rows.map((r) => [r.product_id, { n: Number(r.n), s: Number(r.s) }]));
}

function combine(row, extra) {
  const bn = row.rating_base_count, ba = Number(row.rating_base_avg);
  const n = bn + (extra ? extra.n : 0);
  if (!n) return [0, 0];
  return [Math.round(((ba * bn + (extra ? extra.s : 0)) / n) * 100) / 100, n];
}

async function imagesMap() {
  const rows = await db('product_images').orderBy(['product_id', 'sort', 'id']);
  const m = new Map();
  for (const r of rows) { if (!m.has(r.product_id)) m.set(r.product_id, []); m.get(r.product_id).push(r.url); }
  return m;
}

async function listProducts({ includeInactive = false } = {}) {
  const q = db('products').orderBy('sort').orderBy('created_at', 'desc');
  if (!includeInactive) q.where({ active: true });
  const [rows, ratings, imgs] = await Promise.all([q, ratingsMap(), imagesMap()]);
  return rows.map((r) => toPublic(r, combine(r, ratings.get(r.id)), imgs.get(r.id)));
}

async function getProduct(id) {
  const row = await db('products').where({ id }).first();
  if (!row) return null;
  const [ratings, imgs] = await Promise.all([ratingsMap([id]), db('product_images').where({ product_id: id }).orderBy('sort')]);
  return toPublic(row, combine(row, ratings.get(id)), imgs.map((i) => i.url));
}

async function categories() {
  const rows = await db('categories').orderBy('sort');
  return rows.map((c) => ({ id: c.id, name: c.name, pillar: c.pillar, art: c.art, blurb: c.blurb, subs: fromJson(c.subs, []), facets: fromJson(c.facets, []), dealer: Number(c.dealer_pct) }));
}

async function activeDeals() {
  const nowSql = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const rows = await db('deals').join('products', 'products.id', 'deals.product_id')
    .where('deals.starts_at', '<=', nowSql).andWhere('deals.ends_at', '>', nowSql).andWhere('products.active', true)
    .orderBy('deals.sort').select('deals.product_id', 'deals.pct', 'deals.ends_at');
  const seen = new Set();
  return rows.filter((r) => (seen.has(r.product_id) ? false : seen.add(r.product_id))).map((r) => [r.product_id, r.pct, r.ends_at.replace(' ', 'T') + 'Z']);
}

async function setting(key, fallback = null) {
  const row = await db('settings').where({ key }).first();
  return row ? fromJson(row.value, fallback) : fallback;
}

module.exports = { toPublic, forPricing, listProducts, getProduct, categories, activeDeals, setting, combine, ratingsMap };
