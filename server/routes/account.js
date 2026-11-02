'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { db, toJson } = require('../db');
const { requireUser } = require('../auth');
const { check, HttpError } = require('../util');
const { orderView, userExtras } = require('./public');

const r = express.Router();
r.use(requireUser);

r.get('/me', async (req, res) => res.json({ user: await userExtras(req.user) }));

r.put('/me', async (req, res) => {
  const d = check(z.object({
    name: z.string().trim().min(2, 'Enter your name.').max(120),
    email: z.string().trim().toLowerCase().email('Check the email address.').max(190).optional().or(z.literal('')),
    pan: z.string().trim().max(20).optional().or(z.literal(''))
  }), req.body);
  if (d.email) {
    const other = await db('users').where({ email: d.email }).whereNot({ id: req.user.id }).first();
    if (other) throw new HttpError(409, 'Another account already uses this email.');
  }
  await db('users').where({ id: req.user.id }).update({ name: d.name, email: d.email || null, pan: d.pan || null });
  res.json({ user: await userExtras(await db('users').where({ id: req.user.id }).first()) });
});

r.put('/password', async (req, res) => {
  const d = check(z.object({ current: z.string().min(1, 'Enter your current password.'), next: z.string().min(8, 'Use at least 8 characters for the new password.').max(100) }), req.body);
  if (!(await bcrypt.compare(d.current, req.user.password_hash))) throw new HttpError(400, 'The current password is not correct.');
  await db('users').where({ id: req.user.id }).update({ password_hash: await bcrypt.hash(d.next, 10) });
  res.json({ ok: true });
});

r.get('/orders', async (req, res) => {
  const rows = await db('orders').where({ user_id: req.user.id }).orWhere({ phone: req.user.phone || '__none__' }).orderBy('id', 'desc').limit(100).select('order_no');
  res.json({ orders: await Promise.all(rows.map((o) => orderView(o.order_no))) });
});

const addrSchema = z.object({ city: z.string().trim().min(2, 'Enter the city or district.').max(120), ward: z.string().trim().max(120).optional().or(z.literal('')), street: z.string().trim().min(2, 'Enter the street or landmark.').max(255) });
r.post('/addresses', async (req, res) => {
  const d = check(addrSchema, req.body);
  await db('addresses').insert({ user_id: req.user.id, city: d.city, ward: d.ward || null, street: d.street });
  res.status(201).json({ user: await userExtras(req.user) });
});
r.delete('/addresses/:id', async (req, res) => {
  await db('addresses').where({ id: req.params.id, user_id: req.user.id }).del();
  res.json({ user: await userExtras(req.user) });
});

r.put('/wishlist', async (req, res) => {
  const d = check(z.object({ ids: z.array(z.string().max(60)).max(500) }), req.body);
  await db('users').where({ id: req.user.id }).update({ wishlist: toJson([...new Set(d.ids)]) });
  res.json({ ok: true });
});

r.post('/dealer', async (req, res) => {
  const d = check(z.object({
    business: z.string().trim().min(2, 'Enter the business name.').max(160),
    pan: z.string().trim().regex(/^\d{9}$/, 'PAN/VAT is 9 digits.'),
    type: z.string().max(80).optional(), district: z.string().trim().min(2, 'Enter the district.').max(80),
    note: z.string().max(1000).optional().or(z.literal(''))
  }), req.body);
  if (req.user.dealer_status === 'approved') throw new HttpError(409, 'Your dealer account is already approved.');
  if (req.user.dealer_status === 'pending') throw new HttpError(409, 'Your application is already under review.');
  await db.transaction(async (trx) => {
    await trx('dealer_applications').insert({ user_id: req.user.id, business: d.business, pan: d.pan, type: d.type || null, district: d.district, note: d.note || null });
    await trx('users').where({ id: req.user.id }).update({ dealer_status: 'pending', pan: d.pan });
  });
  res.status(201).json({ user: await userExtras(await db('users').where({ id: req.user.id }).first()) });
});

module.exports = r;
