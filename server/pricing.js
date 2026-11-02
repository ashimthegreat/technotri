'use strict';
/* Server-side pricing. The browser shows the same numbers, but only these are charged. */

const r10 = (n) => Math.round(n / 10) * 10;
const NPT_MS = (5 * 60 + 45) * 60 * 1000;

function unitPrice(p, qty, { dealPct = 0, dealerPct = 0 } = {}) {
  if (!p || p.price == null || p.quote_only) return null;
  let u = p.price;
  if (dealPct) u = Math.min(u, r10(p.price * (1 - dealPct / 100)));
  if (p.breaks && p.breaks.length) {
    let t = p.breaks[0][1];
    for (const [q, pr] of p.breaks) if (qty >= q) t = pr;
    u = Math.min(u, t);
  }
  if (dealerPct) u = Math.min(u, r10(p.price * (1 - dealerPct)));
  return u;
}

/** Nepal working-day delivery estimate (no Saturday deliveries; orders after 4 PM count from next day). */
function etaLabel(days, from = Date.now()) {
  const d = new Date(from + NPT_MS);
  let add = days + (d.getUTCHours() >= 16 ? 1 : 0);
  while (add > 0) { d.setUTCDate(d.getUTCDate() + 1); if (d.getUTCDay() !== 6) add--; }
  if (d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${DAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/**
 * Compute order totals.
 * lines: [{ product, qty, prot }], ctx: { zone, pickup, coupon, protection:[{id,name,pct}], dealers, deals:Map, categories:Map, priorOrders }
 */
function totals(lines, ctx) {
  const out = { lines: [], items: 0, protection: 0, discount: 0, shipping: 0, total: 0, taxable: 0, vat: 0, couponMessage: '', coupon: null };
  for (const l of lines) {
    const p = l.product;
    const cat = ctx.categories.get(p.cat_id);
    const unit = unitPrice(p, l.qty, { dealPct: ctx.deals.get(p.id) || 0, dealerPct: ctx.dealer ? Number(cat?.dealer_pct || 0) : 0 });
    const plan = l.prot && p.price >= 5000 ? ctx.protection.find((x) => x.id === l.prot) : null;
    const protAmt = plan ? r10(unit * plan.pct) * l.qty : 0;
    out.lines.push({ product: p, qty: l.qty, unit, line: unit * l.qty, plan, protAmt });
    out.items += unit * l.qty;
    out.protection += protAmt;
  }
  let freeShip = false;
  const cp = ctx.coupon;
  if (cp) {
    const expired = cp.expires_at && new Date(cp.expires_at.replace(' ', 'T') + 'Z') < new Date();
    if (!cp.active || expired) out.couponMessage = 'This coupon has expired.';
    else if (cp.first_order_only && ctx.priorOrders > 0) out.couponMessage = `${cp.code} is for first orders only.`;
    else if (cp.type === 'pct') { out.discount = Math.min(cp.cap || Infinity, r10(out.items * Number(cp.value) / 100)); out.coupon = cp.code; }
    else if (cp.type === 'catpct') {
      const sub = out.lines.filter((l) => l.product.cat_id === cp.cat_id).reduce((a, l) => a + l.line, 0);
      if (sub >= (cp.min_subtotal || 0)) { out.discount = Math.min(cp.cap || Infinity, r10(sub * Number(cp.value) / 100)); out.coupon = cp.code; }
      else out.couponMessage = `Add Rs ${(cp.min_subtotal - sub).toLocaleString('en-IN')} more from this category to use ${cp.code}.`;
    } else if (cp.type === 'ship') { freeShip = true; out.coupon = cp.code; }
  }
  const z = ctx.zone;
  out.shipping = ctx.pickup || freeShip || !out.lines.length || out.items >= z.free_over ? 0 : z.fee;
  out.total = Math.max(0, out.items + out.protection - out.discount + out.shipping);
  out.taxable = Math.round((out.total / 1.13) * 100) / 100;
  out.vat = Math.round((out.total - out.taxable) * 100) / 100;
  return out;
}

module.exports = { unitPrice, totals, etaLabel, r10, NPT_MS };
