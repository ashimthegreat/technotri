'use strict';
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { loadUser, csrf } = require('./auth');
const seo = require('./seo');

const PUBLIC = path.join(__dirname, '..', 'public');

function createApp() {
  const app = express();
  app.set('trust proxy', 1); // cPanel / Passenger sits behind a proxy
  app.disable('x-powered-by');

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", ...(config.seo.ga4 ? ['https://www.googletagmanager.com'] : [])],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'blob:', ...(config.seo.ga4 ? ['https://*.google-analytics.com', 'https://*.googletagmanager.com'] : [])],
        'connect-src': ["'self'", ...(config.seo.ga4 ? ['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com'] : [])],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': config.cookieSecure ? [] : null
      }
    },
    crossOriginEmbedderPolicy: false
  }));
  app.use(compression());

  /* One address per page: send www/other hostnames to SITE_URL's host, drop trailing slashes and /index.html. */
  const siteHost = new URL(config.siteUrl).host;
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api/')) return next();
    const host = req.get('host') || '';
    const local = /^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(host);
    let p = req.path;
    if (p === '/index.html') p = '/';
    else if (p.length > 1 && p.endsWith('/')) p = p.replace(/\/+$/, '');
    const query = req.originalUrl.slice(req.path.length);
    if (config.isProd && !local && host && host !== siteHost) return res.redirect(301, config.siteUrl + p + query);
    if (p !== req.path) return res.redirect(301, p + query);
    next();
  });
  app.use(cookieParser());
  app.use(express.json({ limit: '200kb' }));

  /* ---------- API ---------- */
  const api = express.Router();
  api.use(loadUser, csrf);
  api.get('/health', async (req, res) => {
    const { db } = require('./db');
    await db.raw('select 1');
    res.json({ ok: true });
  });
  api.use('/auth', require('./routes/auth'));
  api.use('/account', require('./routes/account'));
  api.use('/admin', require('./routes/admin'));
  api.use(require('./routes/public').router);
  api.use((req, res) => res.status(404).json({ error: 'Not found.' }));
  // eslint-disable-next-line no-unused-vars
  api.use((err, req, res, next) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'Images must be 4 MB or smaller.' });
    const status = err.status || 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Something went wrong on our side. Please try again.' : err.message });
  });
  app.use('/api', api);

  /* ---------- SEO files ---------- */
  app.get('/robots.txt', (req, res) => res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(seo.robotsTxt()));
  app.get('/sitemap.xml', async (req, res, next) => { try { res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(await seo.sitemap()); } catch (e) { next(e); } });
  app.get(['/feed/google.xml', '/feed/products.xml'], async (req, res, next) => { try { res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(await seo.merchantFeed()); } catch (e) { next(e); } });

  /* ---------- static files ---------- */
  app.use('/uploads', express.static(config.uploadDir, { maxAge: '30d', fallthrough: false }));
  // Scripts and styles are linked with ?v=<content hash>, so they can be cached for a year.
  app.use((req, res, next) => {
    if (req.query.v) res.set('Cache-Control', 'public, max-age=31536000, immutable');
    else if (/^\/img\//.test(req.path)) res.set('Cache-Control', 'public, max-age=2592000');
    else res.set('Cache-Control', config.isProd ? 'public, max-age=3600' : 'no-cache');
    next();
  });
  app.use(express.static(PUBLIC, { index: false, cacheControl: false }));

  /* ---------- storefront pages (single-page app with server-rendered meta tags) ---------- */
  app.get(/^\/(?!api\/|uploads\/).*/, async (req, res, next) => {
    if (path.extname(req.path)) return res.status(404).send('Not found');
    try {
      const { status, html } = await seo.render(req.path);
      res.status(status).type('html').set('Cache-Control', 'no-cache').send(html);
    } catch (e) { next(e); }
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => { console.error(err); res.status(500).send('Server error'); });
  return app;
}

module.exports = { createApp };
