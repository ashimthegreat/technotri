'use strict';
/*
 * Search-engine and social-sharing layer for the single-page storefront.
 *
 * Every storefront URL is answered with real HTML: the page's own title, description, canonical,
 * Open Graph / X tags, schema.org JSON-LD, and a server-rendered copy of the main content inside
 * #app (headings, prices, specs, links). Crawlers that do not run JavaScript still see the full
 * page; the browser app replaces that copy as soon as it boots.
 *
 * Also: correct 404s, noindex on private pages, sitemap.xml with images and lastmod,
 * and a Google Merchant Center product feed.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const { db, fromJson } = require('./db');
const catalog = require('./catalog');
const { unitPrice } = require('./pricing');

const PUBLIC = path.join(__dirname, '..', 'public');
const SITE = config.siteUrl;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const npr = (n) => 'Rs ' + Math.round(n).toLocaleString('en-IN');
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : s.slice(0, n - 1).replace(/[\s,.;:–-]+\S*$/, '') + '…'; };
/* add sentences while they fit, so descriptions never end mid-word */
const fit = (parts, n = 158) => parts.filter(Boolean).reduce((acc, x) => (!acc ? x : (acc + ' ' + x).length <= n ? acc + ' ' + x : acc), '');
const short = (name, n = 55) => (name.length <= n ? name : clip(name.split(/,| – | - /)[0], n));
const abs = (u) => (/^https?:/.test(u) ? u : SITE + u);
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

/* ---------- static assets: page template with cache-busting versions ---------- */
let template = null;
function assetVersion(file) {
  try { return crypto.createHash('md5').update(fs.readFileSync(path.join(PUBLIC, file))).digest('hex').slice(0, 10); } catch { return '1'; }
}
function page() {
  if (template && config.isProd) return template;
  template = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8')
    .replace(/(src|href)="\/([\w.-]+\.(?:js|css))"/g, (m, attr, f) => `${attr}="/${f}?v=${assetVersion(f)}"`);
  return template;
}

const artImage = (kind) => (kind && fs.existsSync(path.join(PUBLIC, 'img', 'art', kind + '.png')) ? `/img/art/${kind}.png` : null);
const ogImage = (kind) => (kind && fs.existsSync(path.join(PUBLIC, 'img', 'og', kind + '.png')) ? `/img/og/${kind}.png` : '/img/og-default.png');

/* ---------- shared store data (cached briefly) ---------- */
let shared = null, sharedAt = 0;
async function store() {
  if (shared && Date.now() - sharedAt < 60e3) return shared;
  const [company, cats, zones, deals, guides, kits, faq, site] = await Promise.all([
    catalog.setting('company', {}), db('categories').orderBy('sort'), db('zones').orderBy('sort'), catalog.activeDeals(),
    catalog.setting('guides', []), catalog.setting('kits', []), catalog.setting('faq', []), catalog.setting('site', {})
  ]);
  cats.forEach((c) => { c.subs = fromJson(c.subs, []); });
  const live = (l) => l.filter((x) => x.active !== false);
  shared = { company, cats, zones, site, content: { GUIDES: live(guides), KITS: live(kits), FAQ: live(faq) }, deals: new Map(deals.map(([id, pct, ends]) => [id, { pct, ends }])) };
  sharedAt = Date.now();
  return shared;
}
const invalidate = () => { shared = null; };

function orgLd(company) {
  return {
    '@type': ['Organization', 'ElectronicsStore'], '@id': SITE + '/#org',
    name: company.name || 'Technotri Pvt. Ltd.', alternateName: 'Technotri Store', url: SITE + '/',
    logo: SITE + '/logo.webp', image: SITE + '/img/og-default.png',
    email: company.email, telephone: company.phone, vatID: company.pan, taxID: company.pan,
    priceRange: 'Rs 500 – Rs 1,000,000', currenciesAccepted: 'NPR', paymentAccepted: 'Cash, Bank transfer',
    address: { '@type': 'PostalAddress', streetAddress: 'Ward 16, Kumaristhan', addressLocality: 'Kathmandu', addressRegion: 'Bagmati', addressCountry: 'NP' },
    areaServed: { '@type': 'Country', name: 'Nepal' },
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '10:00', closes: '18:00' }],
    sameAs: ['https://technotrinepal.com/']
  };
}
const crumbLd = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, ...(url ? { item: SITE + url } : {}) }))
});
const crumbHtml = (items) => `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([name, url], i) => (i ? '<span>/</span>' : '') + (url && i < items.length - 1 ? `<a href="${url}">${esc(name)}</a>` : `<span>${esc(name)}</span>`)).join('')}</nav>`;

/* price the store actually charges for one unit today (deal applied) */
function livePrice(row, s) {
  const deal = s.deals.get(row.id);
  const price = unitPrice(catalog.forPricing(row), 1, { dealPct: deal ? deal.pct : 0 });
  return { price, deal };
}
const productLink = (p, s) => {
  const { price } = livePrice(p, s);
  return `<li><a href="/p-${esc(p.id)}">${esc(p.name)}</a> — ${price == null ? (p.show_price && p.price ? `guide price ${npr(p.price)}, get a quote` : 'price on quote') : npr(price)}${p.stock > 0 || price == null ? '' : ' (out of stock)'}</li>`;
};

/* ---------- page builders: each returns { title, description, body, ld[], image, type, status, robots } ---------- */
const PAGES = {};

PAGES.home = async (s) => {
  const top = await db('products').where({ active: true }).orderBy('sort').limit(400);
  const dealRows = top.filter((p) => s.deals.has(p.id)).slice(0, 12);
  const { GUIDES } = s.content;
  return {
    title: s.site.homeTitle || 'Technotri Store – Solar, Inverter, UPS, Battery & Wi-Fi Price in Nepal',
    description: s.site.homeDescription || 'Buy solar panels, inverters, UPS, lithium batteries, Wi-Fi routers, ONTs and fibre supplies online in Nepal. VAT invoice, Nepal warranty, delivery nationwide.',
    body: `<h1>Solar, backup power and connectivity equipment in Nepal</h1>
      <p>Technotri Store sells solar energy, backup power and network equipment to homes, businesses, installers and internet service providers across Nepal, with a VAT invoice, Nepal warranty, installation and cash on delivery.</p>
      ${s.cats.map((c) => `<section><h2><a href="/c-${c.id}">${esc(c.name)}</a></h2><p>${esc(c.blurb || '')}</p><ul>${top.filter((p) => p.cat_id === c.id).slice(0, 8).map((p) => productLink(p, s)).join('')}</ul></section>`).join('')}
      ${dealRows.length ? `<section><h2><a href="/deals">Today's deals</a></h2><ul>${dealRows.map((p) => productLink(p, s)).join('')}</ul></section>` : ''}
      <section><h2><a href="/guides">Buying guides</a></h2><ul>${GUIDES.map((g) => `<li><a href="/g-${g.id}">${esc(g.title)}</a></li>`).join('')}</ul></section>`,
    ld: [
      { '@type': 'WebSite', '@id': SITE + '/#website', url: SITE + '/', name: 'Technotri Store', publisher: { '@id': SITE + '/#org' }, inLanguage: 'en',
        potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: SITE + '/search-{search_term_string}' }, 'query-input': 'required name=search_term_string' } },
      orgLd(s.company)
    ]
  };
};

PAGES.c = async (s, id) => {
  const c = s.cats.find((x) => x.id === id);
  if (!c) return null;
  const rows = await db('products').where({ cat_id: id, active: true }).orderBy('sort');
  const prices = rows.map((r) => livePrice(r, s).price).filter((x) => x != null);
  const bySub = c.subs.map((sub) => [sub, rows.filter((r) => r.sub === sub)]).filter(([, l]) => l.length);
  return {
    title: `${c.name} Price in Nepal – Buy Online | Technotri`,
    description: fit([`Buy ${c.name.toLowerCase()} in Nepal: ${c.blurb}.`, `${rows.length} products${prices.length ? ` from ${npr(Math.min(...prices))}` : ''}.`, 'VAT invoice, Nepal warranty, delivery across Nepal.']),
    body: `${crumbHtml([['Home', '/'], [c.name]])}<h1>${esc(c.name)}</h1><p>${esc(c.blurb || '')}</p>
      ${bySub.map(([sub, list]) => `<section><h2>${esc(sub)}</h2><ul>${list.map((p) => productLink(p, s)).join('')}</ul></section>`).join('')}`,
    ld: [crumbLd([['Home', '/'], [c.name, '/c-' + c.id]]), {
      '@type': 'CollectionPage', name: c.name, url: SITE + '/c-' + c.id, description: c.blurb,
      mainEntity: { '@type': 'ItemList', numberOfItems: rows.length, itemListElement: rows.slice(0, 50).map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + '/p-' + r.id, name: r.name })) }
    }],
    image: ogImage(rows[0] && rows[0].art)
  };
};

PAGES.p = async (s, id) => {
  const row = await db('products').where({ id, active: true }).first();
  if (!row) return null;
  const c = s.cats.find((x) => x.id === row.cat_id) || { id: row.cat_id, name: row.cat_id };
  const [imgs, ratings, reviews, related] = await Promise.all([
    db('product_images').where({ product_id: id }).orderBy('sort').pluck('url'),
    catalog.ratingsMap([id]),
    // Only genuine customer reviews go into search markup (catalogue sample reviews never do).
    db('reviews').where({ product_id: id, status: 'published', seeded: false }).orderBy('review_date', 'desc').limit(5),
    db('products').where({ cat_id: row.cat_id, sub: row.sub, active: true }).whereNot({ id }).orderBy('sort').limit(8)
  ]);
  const hl = fromJson(row.highlights, []), specs = fromJson(row.specs, {});
  const real = ratings.get(id);
  const count = real ? real.n : 0;
  const avg = count ? Math.round((real.s / count) * 10) / 10 : 0;
  const { price, deal } = livePrice(row, s);
  const quote = price == null;
  const inStock = row.stock > 0;
  const photos = imgs.length ? imgs.map(abs) : [artImage(row.art)].filter(Boolean).map(abs);
  const ktm = s.zones.find((z) => z.id === 'ktm') || s.zones[0];
  const days = s.zones.map((z) => z.days);
  const name = row.name;
  const until = deal ? deal.ends.slice(0, 10) : new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);

  const offer = quote ? undefined : {
    '@type': 'Offer', url: SITE + '/p-' + id, priceCurrency: 'NPR', price, priceValidUntil: until,
    availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition', seller: { '@id': SITE + '/#org' },
    shippingDetails: ktm ? {
      '@type': 'OfferShippingDetails',
      shippingRate: { '@type': 'MonetaryAmount', value: price >= ktm.free_over ? 0 : ktm.fee, currency: 'NPR' },
      shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'NP' },
      deliveryTime: { '@type': 'ShippingDeliveryTime',
        handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
        transitTime: { '@type': 'QuantitativeValue', minValue: Math.min(...days), maxValue: Math.max(...days), unitCode: 'DAY' } }
    } : undefined,
    hasMerchantReturnPolicy: {
      '@type': 'MerchantReturnPolicy', applicableCountry: 'NP', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
      merchantReturnDays: Number(s.site.returnDays) || 7, returnMethod: 'https://schema.org/ReturnInStore', returnFees: 'https://schema.org/FreeReturn'
    }
  };
  const productLd = {
    '@type': 'Product', '@id': SITE + '/p-' + id + '#product', name, sku: id, mpn: row.model || undefined,
    brand: { '@type': 'Brand', name: row.brand }, category: `${c.name} > ${row.sub}`,
    description: clip([hl.join('. '), row.name].filter(Boolean).join('. '), 5000), image: photos,
    additionalProperty: Object.entries(specs).slice(0, 30).map(([k, v]) => ({ '@type': 'PropertyValue', name: k, value: String(v) })),
    offers: offer,
    aggregateRating: count ? { '@type': 'AggregateRating', ratingValue: avg, reviewCount: count, bestRating: 5, worstRating: 1 } : undefined,
    review: reviews.length ? reviews.map((r) => ({
      '@type': 'Review', author: { '@type': 'Person', name: r.name }, datePublished: String(r.review_date).slice(0, 10), name: r.title, reviewBody: r.body,
      reviewRating: { '@type': 'Rating', ratingValue: r.stars, bestRating: 5, worstRating: 1 }
    })) : undefined
  };
  const priceText = quote ? (row.show_price && row.price ? `Guide price ${npr(row.price)} · final price by quotation` : 'Price on quote') : npr(price);
  return {
    title: `${short(name)} Price in Nepal | Technotri`,
    description: fit([`${quote ? 'Get a quote for' : 'Buy'} ${short(name, 80)} in Nepal${quote ? '' : ` at ${npr(price)}`}.`, hl[0] && hl[0].replace(/\.?$/, '.'), 'VAT invoice, Nepal warranty, delivery across Nepal.', quote ? 'Installation available.' : 'Cash on delivery.']),
    type: 'product', image: imgs[0] || ogImage(row.art), price: quote ? null : price, inStock,
    body: `${crumbHtml([['Home', '/'], [c.name, '/c-' + c.id], [row.sub]])}
      <article><h1>${esc(name)}</h1>
      <p>${esc(row.brand)}${row.model ? ` · Model ${esc(row.model)}` : ''}${count ? ` · Rated ${avg} out of 5 from ${count} reviews` : ''}</p>
      <p><strong>${esc(priceText)}</strong>${!quote && row.mrp > price ? ` <s>${npr(row.mrp)}</s>` : ''} · VAT included · ${quote ? 'Ask us for a quotation' : inStock ? 'In stock' : 'Out of stock'}</p>
      ${hl.length ? `<h2>Highlights</h2><ul>${hl.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${Object.keys(specs).length ? `<h2>Specifications</h2><table><tbody>${Object.entries(specs).map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</tbody></table>` : ''}
      <h2>Warranty and delivery</h2><p>${esc(row.warranty || 'Nepal warranty')}. Delivery across Nepal: Kathmandu Valley next working day, major cities in about 3 working days, other districts in about 5. Pay by cash on delivery or bank transfer. Store pickup at Kumaristhan, Kathmandu.</p>
      ${reviews.length ? `<h2>Customer reviews</h2>${reviews.map((r) => `<blockquote><p><strong>${'★'.repeat(r.stars)} ${esc(r.title)}</strong></p><p>${esc(r.body)}</p><footer>${esc(r.name)}, ${String(r.review_date).slice(0, 10)}</footer></blockquote>`).join('')}` : ''}
      ${related.length ? `<h2>More in ${esc(row.sub)}</h2><ul>${related.map((p) => productLink(p, s)).join('')}</ul>` : ''}
      </article>`,
    ld: [crumbLd([['Home', '/'], [c.name, '/c-' + c.id], [name, '/p-' + id]]), productLd]
  };
};

PAGES.g = async (s, id) => {
  const { GUIDES } = s.content;
  const g = GUIDES.find((x) => x.id === id);
  if (!g) return null;
  const prods = (g.products || []).length ? await db('products').whereIn('id', g.products).where({ active: true }) : [];
  const text = [
    ...(g.sections || []).map((x) => `<h2>${esc(x.h)}</h2>${(x.p || []).map((p) => `<p>${esc(p)}</p>`).join('')}${x.table ? `<table><thead><tr>${x.table[0].map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${x.table.slice(1).map((r) => `<tr>${r.map((v) => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>` : ''}`),
    ...(g.steps || []).map((x, i) => `<h2>Step ${i + 1}: ${esc(x.t)}</h2><p>${esc(x.p)}</p>${x.tip ? `<p>Tip: ${esc(x.tip)}</p>` : ''}${x.warn ? `<p>Warning: ${esc(x.warn)}</p>` : ''}`)
  ].join('');
  const article = {
    '@type': 'Article', headline: g.title, description: g.intro, image: SITE + ogImage(g.art),
    author: { '@id': SITE + '/#org' }, publisher: { '@id': SITE + '/#org' }, mainEntityOfPage: SITE + '/g-' + id,
    articleSection: g.tag, timeRequired: `PT${g.mins}M`, inLanguage: 'en'
  };
  const howto = g.steps ? {
    '@type': 'HowTo', name: g.title, description: g.intro, totalTime: `PT${g.mins}M`, tool: (g.tools || []).map((t) => ({ '@type': 'HowToTool', name: t })),
    step: g.steps.map((x, i) => ({ '@type': 'HowToStep', position: i + 1, name: x.t, text: x.p }))
  } : null;
  return {
    title: `${clip(g.title, 60)} | Technotri Guides`, description: clip(g.intro, 160), type: 'article', image: ogImage(g.art),
    body: `${crumbHtml([['Home', '/'], ['Guides', '/guides'], [g.title]])}<article><h1>${esc(g.title)}</h1><p>${esc(g.kind)} · ${esc(g.tag)} · ${g.mins} min read</p><p>${esc(g.intro)}</p>
      ${g.tools ? `<h2>You need</h2><ul>${g.tools.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}${text}
      ${prods.length ? `<h2>Products in this guide</h2><ul>${prods.map((p) => productLink(p, s)).join('')}</ul>` : ''}</article>`,
    ld: [crumbLd([['Home', '/'], ['Guides', '/guides'], [g.title, '/g-' + id]]), article, howto].filter(Boolean)
  };
};

PAGES.guides = async (s) => {
  const { GUIDES } = s.content;
  return {
    title: 'Buying Guides – Solar, Inverter, UPS, Battery & Wi-Fi | Technotri',
    description: 'Plain-language guides for Nepal: choosing a UPS or inverter, sizing home backup, lithium vs lead-acid batteries, setting up mesh Wi-Fi and fibre connectors.',
    body: `${crumbHtml([['Home', '/'], ['Guides']])}<h1>Guides</h1><ul>${GUIDES.map((g) => `<li><a href="/g-${g.id}">${esc(g.title)}</a> — ${esc(g.intro)}</li>`).join('')}</ul>`,
    ld: [crumbLd([['Home', '/'], ['Guides', '/guides']])]
  };
};

PAGES.deals = async (s) => {
  const rows = s.deals.size ? await db('products').whereIn('id', [...s.deals.keys()]).where({ active: true }) : [];
  return {
    title: "Today's Deals on Solar, UPS, Batteries & Wi-Fi in Nepal | Technotri",
    description: 'Daily deals on solar, backup power and networking equipment in Nepal. New prices every day, VAT invoice and Nepal warranty included.',
    body: `${crumbHtml([['Home', '/'], ["Today's deals"]])}<h1>Today's deals</h1><ul>${rows.map((p) => productLink(p, s)).join('') || '<li>New deals start every day at midnight.</li>'}</ul>`,
    ld: [crumbLd([['Home', '/'], ["Today's deals", '/deals']])]
  };
};

PAGES.kits = async (s) => {
  const { KITS } = s.content;
  return {
    title: 'Ready Solar & Backup Kits for Homes and ISPs in Nepal | Technotri',
    description: 'Matched kits of inverter, batteries, panels and network gear, ready to install. Add a whole kit to your cart or ask for a quote.',
    body: `${crumbHtml([['Home', '/'], ['Kits']])}<h1>Ready kits</h1>${KITS.map((k) => `<section><h2>${esc(k.name)}</h2><p>${esc(k.for || '')} ${esc(k.note || '')}</p></section>`).join('')}`,
    ld: [crumbLd([['Home', '/'], ['Kits', '/kits']])]
  };
};

PAGES.support = async (s) => {
  const { FAQ } = s.content;
  return {
    title: 'Help, Delivery, Returns & Warranty | Technotri Store',
    description: 'Delivery times across Nepal, returns, VAT invoices, warranty claims and installation. Call +977 9820150965 or email info@technotri.com.np.',
    body: `${crumbHtml([['Home', '/'], ['Help & support']])}<h1>Help and support</h1>${FAQ.map(({ q, a }) => `<h2>${esc(q)}</h2><p>${esc(a)}</p>`).join('')}
      <h2>Contact</h2><p>${esc(s.company.name)}, ${esc(s.company.address)}. Phone ${esc(s.company.phone)}. Email ${esc(s.company.email)}. ${esc(s.company.hours)}.</p>`,
    ld: [crumbLd([['Home', '/'], ['Help & support', '/support']]), { '@type': 'FAQPage', mainEntity: FAQ.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }]
  };
};

PAGES.about = async (s) => ({
  title: 'About Technotri Pvt. Ltd. – Kathmandu, Nepal',
  description: 'Technotri Pvt. Ltd. supplies solar energy, backup power and connectivity equipment across Nepal with installation and after-sales support. PAN 610507830.',
  body: `${crumbHtml([['Home', '/'], ['About']])}<h1>About Technotri</h1><p>${esc(s.company.name)} is a Kathmandu technology company. Technotri Store supplies solar energy, backup power and connectivity equipment to homes, businesses, installers and internet service providers across Nepal, with installation and after-sales support from our own team.</p><p>${esc(s.company.address)} · PAN ${esc(s.company.pan)} · Reg. ${esc(s.company.reg)}</p>`,
  ld: [crumbLd([['Home', '/'], ['About', '/about']]), orgLd(s.company)]
});

const simple = (title, description, h1, text) => async () => ({ title, description, body: `${crumbHtml([['Home', '/'], [h1]])}<h1>${esc(h1)}</h1><p>${esc(text)}</p>` });
PAGES.builder = simple('Solar & Backup System Builder – Size Inverter, Battery, Panels | Technotri', 'Pick your appliances and backup hours; get a matched inverter, battery and solar panel set with prices in Nepal.', 'System Builder', 'Size an inverter, battery bank and solar array for your home or office, then add it to your cart or send it for a quote.');
PAGES.quote = simple('Business Quotes, Solar Projects & Network Installation | Technotri', 'Request a quotation for solar systems, online UPS, OLTs and network projects in Nepal. Reply with a PDF quotation within one working day.', 'Business, projects and quotes', 'Send a list of items or describe your project and our sales team replies with a PDF quotation within one working day. Site surveys available.');
PAGES.dealer = simple('Dealer & Installer Pricing – Wholesale Solar, UPS, FTTH | Technotri', 'Electricians, installers, ISPs and resellers in Nepal: apply for dealer prices, carton rates and credit terms.', 'Dealer and installer pricing', 'Approved dealers get category discounts, carton and quantity prices on ONTs, cable and connectors, and credit terms.');
PAGES.lab = simple('Technotri Lab – Tested Backup Runtime & Wi-Fi Range | Technotri', 'Our own runtime, efficiency and coverage measurements for the backup and Wi-Fi products we sell in Nepal.', 'Technotri Lab', 'We test the products we recommend: backup runtime under real loads, inverter efficiency and Wi-Fi coverage.');

/* Pages that exist in the app but must not be indexed. */
const PRIVATE = /^(cart|checkout|signin|forgot|reset-.+|account|my-orders|wishlist|addresses|track|compare|order-.+|admin(-.+)?)$/;

async function render(routePath) {
  const p = decodeURIComponent(routePath.replace(/^\//, '')) || 'home';
  const s = await store();
  let m = null, status = 200, robots = 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';
  const mm = p.match(/^(c|p|g|search)-(.+)$/);
  if (PRIVATE.test(p)) {
    m = { title: 'Technotri Store', description: 'Technotri Store, Nepal.' };
    robots = 'noindex,nofollow';
  } else if (mm && mm[1] === 'search') {
    const q = mm[2].replace(/-/g, ' ');
    m = { title: `Search results for “${clip(q, 40)}” | Technotri`, description: `Products matching ${q} at Technotri Store, Nepal.`, body: `<h1>Search: ${esc(q)}</h1>` };
    robots = 'noindex,follow';
  } else if (mm) {
    m = await PAGES[mm[1]](s, mm[2]);
  } else if (PAGES[p]) {
    m = await PAGES[p](s);
  }
  if (!m) {
    status = 404;
    robots = 'noindex,follow';
    m = { title: 'Page not found | Technotri Store', description: 'This page does not exist.', body: `<h1>We couldn't find that page</h1><p>The link may be old, or the product may no longer be sold. <a href="/">Go to the store</a>.</p>` };
  }

  const url = SITE + (p === 'home' ? '/' : '/' + p);
  const image = abs(m.image || '/img/og-default.png');
  const isSquare = image.includes('/img/art/') || image.includes('/uploads/');
  const graph = (m.ld || []).length ? ld({ '@context': 'https://schema.org', '@graph': [...m.ld, ...(p === 'home' || p === 'about' ? [] : [{ '@type': 'Organization', '@id': SITE + '/#org', name: s.company.name || 'Technotri Pvt. Ltd.', url: SITE + '/', logo: SITE + '/logo.webp' }])] }) : '';
  const tags = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}">`,
    `<meta name="robots" content="${robots}">`,
    status === 200 && robots.startsWith('index') ? `<link rel="canonical" href="${esc(url)}">` : '',
    `<meta property="og:site_name" content="Technotri Store"><meta property="og:locale" content="en_US">`,
    `<meta property="og:type" content="${m.type === 'product' ? 'product' : m.type === 'article' ? 'article' : 'website'}">`,
    `<meta property="og:title" content="${esc(m.title)}"><meta property="og:description" content="${esc(m.description)}">`,
    `<meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${esc(image)}">`,
    isSquare ? '' : '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${esc(m.title)}">`,
    m.price != null && m.type === 'product' ? `<meta property="product:price:amount" content="${m.price}"><meta property="product:price:currency" content="NPR"><meta property="product:availability" content="${m.inStock ? 'in stock' : 'out of stock'}"><meta property="product:condition" content="new">` : '',
    `<meta name="twitter:card" content="${isSquare ? 'summary' : 'summary_large_image'}"><meta name="twitter:title" content="${esc(m.title)}"><meta name="twitter:description" content="${esc(m.description)}"><meta name="twitter:image" content="${esc(image)}">`,
    `<meta name="geo.region" content="NP-BA"><meta name="geo.placename" content="Kathmandu">`,
    config.seo.google ? `<meta name="google-site-verification" content="${esc(config.seo.google)}">` : '',
    config.seo.bing ? `<meta name="msvalidate.01" content="${esc(config.seo.bing)}">` : '',
    config.seo.ga4 ? `<meta name="tt-ga4" content="${esc(config.seo.ga4)}"><script async src="https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.seo.ga4)}"></script><script src="/analytics.js" defer></script>` : '',
    graph
  ].filter(Boolean).join('\n');

  const html = page()
    .replace(/<title>[^<]*<\/title>/, '')
    .replace('<!--SEO-->', tags)
    .replace('<!--APP-->', m.body ? `<div class="ssr">${m.body}</div>` : '')
    .replace(/(id="annText"[^>]*>)[^<]*/, `$1${esc(s.site.announcement || '')}`)
    .replace(/(id="utilPhone"[^>]*>)[^<]*/, `$1${esc(s.company.phone || '')}`)
    .replace(/(id="newsTitle"[^>]*>)[^<]*/, `$1${esc(s.site.newsletterTitle || '')}`)
    .replace(/(id="newsText"[^>]*>)[^<]*/, `$1${esc(s.site.newsletterText || '')}`)
    .replace(/(<span id="footCo"[^>]*>)[\s\S]*?<\/span><\/span><\/div>/, `$1<b style="color:var(--foot-ink);font-size:14px">${esc(s.company.name)}</b><span>${esc(s.company.address)}</span><span class="mono">${esc(s.company.phone)}</span><span>${esc(s.company.email)}</span><span class="mono" style="font-size:12px">PAN ${esc(s.company.pan)} · Reg. ${esc(s.company.reg)}</span></span></div>`)
    .replace(/(<ul id="footCats">)[\s\S]*?<\/ul>/, `$1${s.cats.map((c) => `<li><a href="/c-${c.id}">${esc(c.name)}</a></li>`).join('')}</ul>`)
    .replace('<span id="navCats" style="display:contents"></span>', `<span id="navCats" style="display:contents">${s.cats.map((c) => `<a href="/c-${c.id}">${esc(c.name)}</a>`).join('')}</span>`);
  return { status, html };
}

/* ---------- sitemap.xml (pages, products with images, guides) ---------- */
async function sitemap() {
  const s = await store();
  const [products, imgs] = await Promise.all([
    db('products').where({ active: true }).orderBy('sort').select('id', 'name', 'art', 'cat_id', 'updated_at'),
    db('product_images').orderBy(['product_id', 'sort']).select('product_id', 'url')
  ]);
  const iMap = new Map();
  imgs.forEach((i) => { if (!iMap.has(i.product_id)) iMap.set(i.product_id, []); iMap.get(i.product_id).push(i.url); });
  const day = (d) => (d ? String(d).slice(0, 10) : null);
  const latest = (list) => list.map((x) => day(x.updated_at)).filter(Boolean).sort().pop();
  const entries = [
    { u: '/', pr: '1.0', cf: 'daily', lm: latest(products) },
    { u: '/deals', pr: '0.8', cf: 'daily' },
    ...s.cats.map((c) => ({ u: '/c-' + c.id, pr: '0.9', cf: 'daily', lm: latest(products.filter((p) => p.cat_id === c.id)) })),
    ...products.map((p) => ({ u: '/p-' + p.id, pr: '0.8', cf: 'weekly', lm: day(p.updated_at), img: (iMap.get(p.id) || [artImage(p.art)].filter(Boolean)).map((x) => ({ loc: abs(x), title: p.name })) })),
    { u: '/guides', pr: '0.6', cf: 'monthly' },
    ...s.content.GUIDES.map((g) => ({ u: '/g-' + g.id, pr: '0.6', cf: 'monthly' })),
    ...['/kits', '/builder', '/quote', '/dealer', '/support', '/about', '/lab'].map((u) => ({ u, pr: '0.5', cf: 'monthly' }))
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.map((e) => `  <url><loc>${esc(SITE + e.u)}</loc>${e.lm ? `<lastmod>${e.lm}</lastmod>` : ''}<changefreq>${e.cf}</changefreq><priority>${e.pr}</priority>${(e.img || []).map((i) => `<image:image><image:loc>${esc(i.loc)}</image:loc></image:image>`).join('')}</url>`).join('\n')}
</urlset>
`;
}

/* ---------- Google Merchant Center / Facebook catalogue feed (RSS 2.0) ---------- */
async function merchantFeed() {
  const s = await store();
  const [rows, imgs] = await Promise.all([
    db('products').where({ active: true, quote_only: false }).whereNotNull('price').orderBy('sort'),
    db('product_images').orderBy(['product_id', 'sort']).select('product_id', 'url')
  ]);
  const iMap = new Map();
  imgs.forEach((i) => { if (!iMap.has(i.product_id)) iMap.set(i.product_id, []); iMap.get(i.product_id).push(abs(i.url)); });
  const ktm = s.zones.find((z) => z.id === 'ktm') || s.zones[0];
  const items = rows.map((r) => {
    const c = s.cats.find((x) => x.id === r.cat_id);
    const { price, deal } = livePrice(r, s);
    const pics = iMap.get(r.id) || [artImage(r.art)].filter(Boolean).map(abs);
    const hl = fromJson(r.highlights, []);
    const regular = Math.max(r.mrp || 0, r.price);
    return `<item>
<g:id>${esc(r.id)}</g:id><title>${esc(clip(r.name, 150))}</title><description>${esc(clip(hl.join('. ') || r.name, 5000))}</description>
<link>${esc(SITE + '/p-' + r.id)}</link>${pics[0] ? `<g:image_link>${esc(pics[0])}</g:image_link>` : ''}${pics.slice(1, 10).map((x) => `<g:additional_image_link>${esc(x)}</g:additional_image_link>`).join('')}
<g:availability>${r.stock > 0 ? 'in_stock' : 'out_of_stock'}</g:availability><g:condition>new</g:condition>
<g:price>${regular} NPR</g:price>${price < regular ? `<g:sale_price>${price} NPR</g:sale_price>` : ''}${deal ? `<g:sale_price_effective_date>${new Date().toISOString().slice(0, 19)}Z/${deal.ends.slice(0, 19)}Z</g:sale_price_effective_date>` : ''}
<g:brand>${esc(r.brand)}</g:brand>${r.model ? `<g:mpn>${esc(r.model)}</g:mpn>` : '<g:identifier_exists>no</g:identifier_exists>'}
<g:product_type>${esc((c ? c.name : r.cat_id) + ' > ' + r.sub)}</g:product_type>
${ktm ? `<g:shipping><g:country>NP</g:country><g:service>Standard</g:service><g:price>${price >= ktm.free_over ? 0 : ktm.fee} NPR</g:price></g:shipping>` : ''}
</item>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>
<title>Technotri Store</title><link>${esc(SITE + '/')}</link><description>Solar, backup power and connectivity products in Nepal</description>
${items.join('\n')}
</channel></rss>
`;
}

function robotsTxt() {
  return `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /cart
Disallow: /checkout
Disallow: /account
Disallow: /my-orders
Disallow: /addresses
Disallow: /wishlist
Disallow: /order-
Disallow: /signin
Disallow: /forgot
Disallow: /reset-

Sitemap: ${SITE}/sitemap.xml
`;
}

module.exports = { render, sitemap, merchantFeed, robotsTxt, invalidate };
