'use strict';
/*
 * Renders the product illustrations (public/art.js) to PNG files so search engines and social
 * networks have a real image for every product until staff upload photos.
 *   public/img/art/<kind>.png   800x800 product image (Google Shopping, Product rich results)
 *   public/img/og/<kind>.png    1200x630 share card (Facebook, WhatsApp, X, LinkedIn)
 *   public/img/og-default.png   1200x630 site share card
 * Run on a development machine (needs Playwright): npm run build:images
 * The PNGs are committed, so the cPanel server never needs a browser.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'img');
const COLORS = { '--art-body': '#E6ECF2', '--art-dark': '#16293C', '--art-mid': '#93A4B5', '--art-line': '#5A6C7E', '--art-glow': '#E8A512', '--art-led': '#2BB673', '--art-blue': '#2D6CC0' };

function loadArt() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'public', 'art.js'), 'utf8'), sandbox);
  return (kind) => sandbox.window.TTArt(kind, 0).replace(/var\((--art-[a-z]+)\)/g, (m, k) => COLORS[k] || '#888');
}

async function main() {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { console.error('Install Playwright first: npm i -D playwright && npx playwright install chromium'); process.exit(1); }
  const art = loadArt();
  const { loadCatalog } = require('../server/seeds/01_catalog');
  const kinds = [...new Set(loadCatalog().PRODUCTS.map((p) => p.art).filter(Boolean))].sort();
  const logo = 'data:image/webp;base64,' + fs.readFileSync(path.join(ROOT, 'public', 'logo.webp')).toString('base64');
  fs.mkdirSync(path.join(OUT, 'art'), { recursive: true });
  fs.mkdirSync(path.join(OUT, 'og'), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  const shot = async (html, w, h, file) => {
    await page.setViewportSize({ width: w, height: h });
    await page.setContent(`<!doctype html><html><body style="margin:0;width:${w}px;height:${h}px;overflow:hidden;font-family:'IBM Plex Sans',Arial,sans-serif">${html}</body></html>`);
    await page.screenshot({ path: file, type: 'png' });
  };
  const card = (inner, sub) => `<div style="display:grid;grid-template-columns:1fr 520px;height:630px;background:#fff">
     <div style="padding:64px 56px;display:flex;flex-direction:column;justify-content:space-between;border-top:14px solid #D31220">
       <img src="${logo}" style="width:300px">
       <div style="font-size:52px;font-weight:700;line-height:1.1;color:#0F1E2E">${sub}</div>
       <div style="font-size:24px;color:#4A5B6C">technotri.com.np · VAT invoice · Nepal warranty · Delivery across Nepal</div></div>
     <div style="background:#F2F5F8;display:flex;align-items:center;justify-content:center;border-top:14px solid #0F1E2E"><div style="width:440px">${inner}</div></div></div>`;

  for (const k of kinds) {
    await shot(`<div style="width:800px;height:800px;background:#fff;display:flex;align-items:center;justify-content:center"><div style="width:660px">${art(k)}</div></div>`, 800, 800, path.join(OUT, 'art', `${k}.png`));
    await shot(card(art(k), 'Solar, backup power and connectivity'), 1200, 630, path.join(OUT, 'og', `${k}.png`));
  }
  await shot(card(art('hybrid'), 'Solar, backup power and connectivity for Nepal'), 1200, 630, path.join(OUT, 'og-default.png'));
  await browser.close();
  console.log(`Rendered ${kinds.length} product images and share cards into public/img/`);
}
main().catch((e) => { console.error(e); process.exit(1); });
