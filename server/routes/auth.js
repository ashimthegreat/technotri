'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const { db } = require('../db');
const { setSession, clearSession, publicUser } = require('../auth');
const { check, PHONE, cleanPhone, HttpError, sqlNow } = require('../util');

const r = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Wait 15 minutes and try again.' } });

const regSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  phone: z.string().transform(cleanPhone).refine((p) => PHONE.test(p), 'Enter a 10-digit mobile number starting with 96, 97 or 98.'),
  email: z.string().trim().toLowerCase().email('Check the email address.').max(190).optional().or(z.literal('')),
  password: z.string().min(8, 'Use at least 8 characters for the password.').max(100)
});

r.post('/register', limiter, async (req, res) => {
  const d = check(regSchema, req.body);
  if (await db('users').where({ phone: d.phone }).first()) throw new HttpError(409, 'An account with this mobile number already exists. Sign in instead.');
  if (d.email && (await db('users').where({ email: d.email }).first())) throw new HttpError(409, 'An account with this email already exists. Sign in instead.');
  const [id] = await db('users').insert({ name: d.name, phone: d.phone, email: d.email || null, password_hash: await bcrypt.hash(d.password, 10), role: 'customer' });
  const user = await db('users').where({ id }).first();
  setSession(res, user);
  res.status(201).json({ user: publicUser(user, { orderCount: 0, addresses: [] }) });
});

const loginSchema = z.object({ login: z.string().trim().min(3, 'Enter your mobile number or email.'), password: z.string().min(1, 'Enter your password.') });

r.post('/login', limiter, async (req, res) => {
  const d = check(loginSchema, req.body);
  const id = d.login.includes('@') ? { email: d.login.toLowerCase() } : { phone: cleanPhone(d.login) };
  const user = await db('users').where(id).andWhere({ active: true }).first();
  if (!user || !(await bcrypt.compare(d.password, user.password_hash))) throw new HttpError(401, 'That mobile number or email and password do not match.');
  await db('users').where({ id: user.id }).update({ last_login_at: sqlNow() });
  setSession(res, user);
  const orderCount = (await db('orders').where({ user_id: user.id }).count({ n: '*' }).first()).n;
  res.json({ user: publicUser(user, { orderCount: Number(orderCount) }) });
});

r.post('/logout', (req, res) => { clearSession(res); res.json({ ok: true }); });

module.exports = r;
