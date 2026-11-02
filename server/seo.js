'use strict';
/* Server-side meta tags, JSON-LD and sitemap for the single-page storefront. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const config = require('./config');
const { db, fromJson } = require('./db');

const PUBLIC = path.join(__dirname, '..', 'public');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let template = null;
function page() {
  if (!template || !config.isProd) template = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
  return template;
}

let guides = null;
function guideList() {
  if (guides) return guides;
  try {
    const sandbox = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(PUBLIC, 'content.js'), 'utf8'), sandbox);
    guides = sandbox.window.TT_CONTENT.GUIDES.map((g) => ({ id: g.id, title: g.title, intro: g.intro }));
  } catch { guides = []; }
  return guides;
}

const DEFAULT = {
  title: 'Technotri Store · Solar, backup power and connectivity in Nepal',
  description: 'Solar panels, hybrid inverters, UPS, LiFePO4 batteries, Wi-Fi, ONTs and fibre supplies for homes, businesses and ISPs in Nepal. VAT invoice, Nepal warranty, installation.'
};

async function metaFor(routePath) {
  const p = routePath.replace(/^\//, '');
  let m = { ...DEFAULT, url: config.siteUrl + routePath, image: config.siteUrl + '/logo.webp', jsonld: null };
  if (p.startsWith('p-')) {
    const row = await db('products').where({ id: p.slice(2), active: true }).first();
    if (row) {
      const hl = fromJson(row.highlights, []);
      const img = await db('product_images').where({ product_id: row.id }).orderBy('sort').first();
      m.title = `${row.name} · Technotri Store`;
      m.description = (hl.join('. ') || row.name).slice(0, 300);
      if (img) m.image = config.siteUrl + img.url;
      m.jsonld = {
        '@context': 'https://schema.org', '@type': 'Product', name: row.name, sku: row.id, mpn: row.model || undefined,
        brand: { '@type': 'Brand', name: row.brand }, description: m.description, image: m.image,
        offers: row.price && !row.quote_only ? { '@type': 'Offer', priceCurrency: 'NPR', price: row.price, availability: row.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: m.url } : undefined,
        aggregateRating: row.rating_base_count ? { '@type': 'AggregateRating', ratingValue: Number(row.rating_base_avg), reviewCount: row.rating_base_count } : undefined
      };
    }
  } else if (p.startsWith('c-')) {
    const c = await db('categories').where({ id: p.slice(2) }).first();
    if (c) { m.title = `${c.name} · Technotri Store Nepal`; m.description = `${c.blurb}. Buy online with delivery across Nepal.`; }
  } else if (p.startsWith('g-')) {
    const g = guideList().find((x) => x.id === p.slice(2));
    if (g) { m.title = `${g.title} · Technotri Guides`; m.description = g.intro; }
  } else if (p === 'deals') m.title = "Today's deals · Technotri Store";
  else if (p === 'builder') m.title = 'System Builder · Size solar and backup power · Technotri';
  return m;
}

async function render(routePath) {
  const m = await metaFor(routePath);
  const tags = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}">`,
    `<link rel="canonical" href="${esc(m.url)}">`,
    `<meta property="og:type" content="website"><meta property="og:site_name" content="Technotri Store">`,
    `<meta property="og:title" content="${esc(m.title)}"><meta property="og:description" content="${esc(m.description)}">`,
    `<meta property="og:url" content="${esc(m.url)}"><meta property="og:image" content="${esc(m.image)}">`,
    m.jsonld ? `<script type="application/ld+json">${JSON.stringify(m.jsonld).replace(/</g, '\\u003c')}</script>` : ''
  ].join('\n');
  return page().replace(/<title>[^<]*<\/title>/, '').replace('<!--SEO-->', tags);
}

async function sitemap() {
  const [products, cats] = await Promise.all([db('products').where({ active: true }).select('id', 'updated_at'), db('categories').select('id')]);
  const urls = ['/', '/deals', '/builder', '/kits', '/guides', '/quote', '/support',
    ...cats.map((c) => '/c-' + c.id), ...products.map((p) => '/p-' + p.id), ...guideList().map((g) => '/g-' + g.id)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(config.siteUrl + u)}</loc></url>`).join('\n')}\n</urlset>\n`;
}

module.exports = { render, sitemap };
