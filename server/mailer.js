'use strict';
/* Optional email. If SMTP_* is not set, messages are skipped (logged in development). */
const nodemailer = require('nodemailer');
const config = require('./config');

let transport = null;
if (config.smtp.host && config.smtp.user) {
  transport = nodemailer.createTransport({ host: config.smtp.host, port: config.smtp.port, secure: config.smtp.secure, auth: { user: config.smtp.user, pass: config.smtp.pass } });
}

const npr = (n) => 'Rs ' + Math.round(n).toLocaleString('en-IN');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function send(to, subject, html) {
  if (!to) return;
  if (!transport) { if (!config.isProd) console.log(`[mail skipped] ${subject} -> ${to}`); return; }
  try { await transport.sendMail({ from: config.smtp.from, to, subject, html }); }
  catch (e) { console.error('Mail failed:', e.message); }
}

function orderHtml(o, items) {
  return `<div style="font-family:Arial,sans-serif;color:#0F1E2E">
  <h2 style="color:#D31220">Order ${esc(o.order_no)}</h2>
  <p>Thank you, ${esc(o.name)}. ${o.pay_method === 'cod' ? 'We will call you to confirm before dispatch.' : 'We will email bank details for the transfer.'}</p>
  <table cellpadding="6" style="border-collapse:collapse;border:1px solid #E2E9F0">
  ${items.map((i) => `<tr><td>${i.qty} × ${esc(i.name)}</td><td align="right">${npr(i.unit * i.qty + i.protection_amt)}</td></tr>`).join('')}
  ${o.discount ? `<tr><td>Discount (${esc(o.coupon)})</td><td align="right">−${npr(o.discount)}</td></tr>` : ''}
  <tr><td>Delivery</td><td align="right">${o.shipping ? npr(o.shipping) : 'Free'}</td></tr>
  <tr><td><b>Total (incl. VAT ${npr(o.vat)})</b></td><td align="right"><b>${npr(o.total)}</b></td></tr></table>
  <p>Technotri Pvt. Ltd. · +977 9820150965 · info@technotri.com.np</p></div>`;
}

module.exports = {
  orderPlaced: (o, items) => Promise.all([
    send(o.email, `Your Technotri order ${o.order_no}`, orderHtml(o, items)),
    send(config.smtp.notify, `New order ${o.order_no} · ${npr(o.total)}`, orderHtml(o, items))
  ]),
  orderStatus: (o) => send(o.email, `Order ${o.order_no} is ${o.status}`, `<p>Your order ${esc(o.order_no)} is now <b>${esc(o.status)}</b>.</p>`),
  quoteReceived: (q) => send(config.smtp.notify, `New quote request ${q.quote_no}`, `<p>${esc(q.name)} (${esc(q.phone)}) · ${esc(q.type)}<br>${esc(q.requirements)}</p>`),
  dealerDecision: (u, status) => send(u.email, `Your Technotri dealer application was ${status}`, `<p>Hello ${esc(u.name)}, your dealer application was <b>${esc(status)}</b>.</p>`)
};
