'use strict';
const jwt = require('jsonwebtoken');
const config = require('./config');
const { db, fromJson } = require('./db');

const COOKIE = 'tt_session';
const MAX_AGE = 30 * 24 * 3600 * 1000;

function setSession(res, user) {
  const token = jwt.sign({ uid: user.id }, config.jwtSecret, { expiresIn: '30d' });
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, maxAge: MAX_AGE, path: '/' });
}
function clearSession(res) { res.clearCookie(COOKIE, { path: '/' }); }

/** Loads req.user from the session cookie (if any). Never fails the request. */
async function loadUser(req, _res, next) {
  req.user = null;
  const token = req.cookies && req.cookies[COOKIE];
  if (token) {
    try {
      const { uid } = jwt.verify(token, config.jwtSecret);
      const u = await db('users').where({ id: uid, active: true }).first();
      if (u) req.user = u;
    } catch { /* expired or invalid: treat as signed out */ }
  }
  next();
}

const requireUser = (req, res, next) => (req.user ? next() : res.status(401).json({ error: 'Please sign in first.' }));
const requireStaff = (req, res, next) => (req.user && (req.user.role === 'admin' || req.user.role === 'staff') ? next() : res.status(req.user ? 403 : 401).json({ error: 'Staff sign-in required.' }));
const requireAdmin = (req, res, next) => (req.user && req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admin access required.' }));

/** CSRF guard: state-changing API calls must come from our own scripts (custom header + same-site cookie). */
function csrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'technotri') return res.status(403).json({ error: 'Request blocked.' });
  next();
}

function publicUser(u, extra = {}) {
  if (!u) return null;
  return { id: u.id, name: u.name, phone: u.phone, email: u.email, pan: u.pan, role: u.role, dealer: u.dealer_status, wishlist: fromJson(u.wishlist, []), ...extra };
}

module.exports = { setSession, clearSession, loadUser, requireUser, requireStaff, requireAdmin, csrf, publicUser };
