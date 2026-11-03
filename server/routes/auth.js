'use strict';
/*
 * Accounts: email + password sign-up (mobile optional), email verification, password reset by email,
 * and "Continue with Google / Facebook" (OAuth 2, server-side; enabled when the keys are set).
 */
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { db } = require('../db');
const mailer = require('../mailer');
const { setSession, clearSession, publicUser, requireUser } = require('../auth');
const { check, PHONE, cleanPhone, HttpError, sqlNow } = require('../util');

const r = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Wait 15 minutes and try again.' } });
const mailLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 6, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many emails requested. Try again in an hour.' } });

const EMAIL = z.string().trim().toLowerCase().email('Enter a valid email address.').max(190);
const PASSWORD = z.string().min(8, 'Use at least 8 characters for the password.').max(100);

/* ---------- one-time email tokens (verification, password reset) ---------- */
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
async function issueToken(userId, kind, hours) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + hours * 3600e3).toISOString().slice(0, 19).replace('T', ' ');
  await db('auth_tokens').where({ user_id: userId, kind }).whereNull('used_at').update({ used_at: sqlNow() }); // older links stop working
  await db('auth_tokens').insert({ user_id: userId, kind, token_hash: sha(token), expires_at: expires });
  return token;
}
async function useToken(token, kind) {
  const row = await db('auth_tokens').where({ token_hash: sha(String(token || '')), kind }).whereNull('used_at').andWhere('expires_at', '>', sqlNow()).first();
  if (!row) return null;
  await db('auth_tokens').where({ id: row.id }).update({ used_at: sqlNow() });
  return db('users').where({ id: row.user_id, active: true }).first();
}
async function sendVerification(user) {
  if (!user.email || user.email_verified_at) return;
  const token = await issueToken(user.id, 'verify', 72);
  await mailer.verifyEmail(user, `${config.siteUrl}/api/auth/verify?token=${token}`);
}
async function extras(user) {
  const n = (await db('orders').where({ user_id: user.id }).count({ n: '*' }).first()).n;
  const addresses = await db('addresses').where({ user_id: user.id }).orderBy('id', 'desc');
  return { orderCount: Number(n), addresses };
}

/* ---------- which sign-in buttons to show ---------- */
r.get('/providers', (req, res) => res.json({
  google: !!(config.oauth.google.id && config.oauth.google.secret),
  facebook: !!(config.oauth.facebook.id && config.oauth.facebook.secret),
  email: mailer.enabled
}));

/* ---------- email sign-up and sign-in ---------- */
const regSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  email: EMAIL,
  phone: z.string().optional().transform((p) => (p ? cleanPhone(p) : '')).refine((p) => !p || PHONE.test(p), 'Enter a 10-digit mobile number starting with 96, 97 or 98, or leave it blank.'),
  password: PASSWORD
});
r.post('/register', limiter, async (req, res) => {
  const d = check(regSchema, req.body);
  if (await db('users').where({ email: d.email }).first()) throw new HttpError(409, 'An account with this email already exists. Sign in, or use “Forgot password”.');
  if (d.phone && (await db('users').where({ phone: d.phone }).first())) throw new HttpError(409, 'An account with this mobile number already exists. Sign in instead.');
  const [id] = await db('users').insert({
    name: d.name, email: d.email, phone: d.phone || null, password_hash: await bcrypt.hash(d.password, 10), role: 'customer',
    email_verified_at: mailer.enabled ? null : sqlNow() // without email set up there is no way to verify, so don't block anyone
  });
  const user = await db('users').where({ id }).first();
  await sendVerification(user);
  setSession(res, user);
  res.status(201).json({ user: publicUser(user, { orderCount: 0, addresses: [] }), verificationSent: !user.email_verified_at });
});

const loginSchema = z.object({ login: z.string().trim().min(3, 'Enter your email (or mobile number).'), password: z.string().min(1, 'Enter your password.') });
r.post('/login', limiter, async (req, res) => {
  const d = check(loginSchema, req.body);
  const where = d.login.includes('@') ? { email: d.login.toLowerCase() } : { phone: cleanPhone(d.login) };
  const user = await db('users').where(where).first();
  if (user && !user.active) throw new HttpError(403, 'This account is disabled. Call us if you think this is a mistake.');
  if (user && !user.password_hash) throw new HttpError(400, `This account signs in with ${user.google_id ? 'Google' : 'Facebook'}. Use that button, or “Forgot password” to set a password.`);
  if (!user || !(await bcrypt.compare(d.password, user.password_hash))) throw new HttpError(401, 'That email and password do not match.');
  await db('users').where({ id: user.id }).update({ last_login_at: sqlNow() });
  setSession(res, user);
  res.json({ user: publicUser(user, await extras(user)) });
});

r.post('/logout', (req, res) => { clearSession(res); res.json({ ok: true }); });

/* ---------- email verification ---------- */
r.get('/verify', async (req, res) => {
  const user = await useToken(req.query.token, 'verify');
  if (!user) return res.redirect('/account?m=verify_failed');
  await db('users').where({ id: user.id }).update({ email_verified_at: sqlNow() });
  setSession(res, user);
  res.redirect('/account?m=verified');
});
r.post('/resend-verification', requireUser, mailLimiter, async (req, res) => {
  if (req.user.email_verified_at) return res.json({ ok: true, already: true });
  if (!mailer.enabled) throw new HttpError(503, 'Email is not set up on the store yet.');
  await sendVerification(req.user);
  res.json({ ok: true });
});

/* ---------- forgotten password ---------- */
r.post('/forgot', mailLimiter, async (req, res) => {
  const d = check(z.object({ email: EMAIL }), req.body);
  if (!mailer.enabled) throw new HttpError(503, 'Password reset by email is not set up yet. Call us and we will reset it for you.');
  const user = await db('users').where({ email: d.email, active: true }).first();
  if (user) {
    const token = await issueToken(user.id, 'reset', 2);
    await mailer.resetPassword(user, `${config.siteUrl}/reset-${token}`);
  }
  res.json({ ok: true }); // same answer either way, so the form can't be used to find out who has an account
});
r.post('/reset', limiter, async (req, res) => {
  const d = check(z.object({ token: z.string().min(20).max(100), password: PASSWORD }), req.body);
  const user = await useToken(d.token, 'reset');
  if (!user) throw new HttpError(400, 'This reset link has expired or was already used. Ask for a new one.');
  await db('users').where({ id: user.id }).update({ password_hash: await bcrypt.hash(d.password, 10), email_verified_at: user.email_verified_at || sqlNow(), last_login_at: sqlNow() });
  setSession(res, user);
  res.json({ user: publicUser(await db('users').where({ id: user.id }).first(), await extras(user)) });
});

/* ---------- Google and Facebook ---------- */
const PROVIDERS = {
  google: {
    cfg: () => config.oauth.google,
    authUrl: (c, redirect, state) => 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({ client_id: c.id, redirect_uri: redirect, response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' }),
    async profile(c, redirect, code) {
      const tok = await fetchJson('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: c.id, client_secret: c.secret, redirect_uri: redirect, grant_type: 'authorization_code' }) });
      const p = await fetchJson('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: 'Bearer ' + tok.access_token } });
      return { id: String(p.sub), email: p.email ? String(p.email).toLowerCase() : null, verified: !!p.email_verified, name: p.name || p.given_name || '' };
    }
  },
  facebook: {
    cfg: () => config.oauth.facebook,
    authUrl: (c, redirect, state) => 'https://www.facebook.com/v19.0/dialog/oauth?' + new URLSearchParams({ client_id: c.id, redirect_uri: redirect, state, scope: 'email,public_profile', response_type: 'code' }),
    async profile(c, redirect, code) {
      const tok = await fetchJson('https://graph.facebook.com/v19.0/oauth/access_token?' + new URLSearchParams({ client_id: c.id, client_secret: c.secret, redirect_uri: redirect, code }));
      const p = await fetchJson('https://graph.facebook.com/v19.0/me?' + new URLSearchParams({ fields: 'id,name,email', access_token: tok.access_token }));
      return { id: String(p.id), email: p.email ? String(p.email).toLowerCase() : null, verified: !!p.email, name: p.name || '' };
    }
  }
};
async function fetchJson(url, opts) {
  const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(10000) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`OAuth request failed (${res.status})`);
  return data;
}
const safeNext = (n) => (typeof n === 'string' && /^\/[a-z0-9\-/]*$/i.test(n) && !n.startsWith('//') ? n : '/account');
const STATE_COOKIE = 'tt_oauth';

r.get('/:provider/start', (req, res) => {
  const P = PROVIDERS[req.params.provider];
  const c = P && P.cfg();
  if (!c || !c.id || !c.secret) return res.redirect('/signin?m=oauth_off');
  const state = crypto.randomBytes(16).toString('base64url');
  res.cookie(STATE_COOKIE, JSON.stringify({ state, next: safeNext(req.query.next), p: req.params.provider }), { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, maxAge: 10 * 60 * 1000, path: '/api/auth' });
  res.redirect(P.authUrl(c, `${config.siteUrl}/api/auth/${req.params.provider}/callback`, state));
});

r.get('/:provider/callback', async (req, res) => {
  const name = req.params.provider;
  const P = PROVIDERS[name];
  let saved = {};
  try { saved = JSON.parse(req.cookies[STATE_COOKIE] || '{}'); } catch { /* ignore */ }
  res.clearCookie(STATE_COOKIE, { path: '/api/auth' });
  if (!P || req.query.error) return res.redirect('/signin?m=oauth_cancelled');
  if (!saved.state || saved.state !== req.query.state || saved.p !== name || !req.query.code) return res.redirect('/signin?m=oauth_error');
  let prof;
  try { prof = await P.profile(P.cfg(), `${config.siteUrl}/api/auth/${name}/callback`, String(req.query.code)); }
  catch (e) { console.error(`${name} sign-in failed:`, e.message); return res.redirect('/signin?m=oauth_error'); }

  const col = name === 'google' ? 'google_id' : 'facebook_id';
  let user = await db('users').where({ [col]: prof.id }).first();
  if (!user && prof.email) {
    const byEmail = await db('users').where({ email: prof.email }).first();
    if (byEmail) {
      // Only link to an existing account when the provider has confirmed the email address.
      if (!prof.verified) return res.redirect('/signin?m=oauth_unverified');
      await db('users').where({ id: byEmail.id }).update({ [col]: prof.id, email_verified_at: byEmail.email_verified_at || sqlNow() });
      user = await db('users').where({ id: byEmail.id }).first();
    }
  }
  if (!user) {
    if (!prof.email) return res.redirect('/signin?m=oauth_noemail');
    const [id] = await db('users').insert({ name: (prof.name || prof.email.split('@')[0]).slice(0, 120), email: prof.email, [col]: prof.id, role: 'customer', email_verified_at: prof.verified ? sqlNow() : null });
    user = await db('users').where({ id }).first();
  }
  if (!user.active) return res.redirect('/signin?m=disabled');
  // Staff and admin accounts must use their password, so a hijacked social account can't open the admin.
  if (user.role !== 'customer') return res.redirect('/signin?m=staff_password');
  await db('users').where({ id: user.id }).update({ last_login_at: sqlNow() });
  setSession(res, user);
  res.redirect(safeNext(saved.next));
});

r.sendVerification = sendVerification;
module.exports = r;
