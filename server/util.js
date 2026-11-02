'use strict';
const crypto = require('crypto');
const { NPT_MS } = require('./pricing');

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

/** Validate with a zod schema; turns the first problem into a plain-language 400. */
function check(schema, data) {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  const issue = r.error.issues[0];
  const field = issue.path.join('.');
  throw new HttpError(400, issue.message && !issue.message.startsWith('Invalid') && !issue.message.startsWith('Too') ? issue.message : `Check the ${field || 'form'} field.`);
}

const PHONE = /^9[678]\d{8}$/;
const cleanPhone = (s) => String(s || '').replace(/\D/g, '').replace(/^977/, '');

/** TT + YYMMDD (Nepal date) + '-' + 4 random digits */
function docNumber(prefix) {
  const d = new Date(Date.now() + NPT_MS);
  const ymd = String(d.getUTCFullYear()).slice(2) + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0');
  return `${prefix}${ymd}-${String(crypto.randomInt(1000, 10000))}`;
}

const sqlNow = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

module.exports = { HttpError, check, PHONE, cleanPhone, docNumber, sqlNow };
