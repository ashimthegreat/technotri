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
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'blob:'],
        'connect-src': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': config.cookieSecure ? [] : null
      }
    },
    crossOriginEmbedderPolicy: false
  }));
  app.use(compression());
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
  app.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nDisallow: /api/\nDisallow: /admin\nSitemap: ${config.siteUrl}/sitemap.xml\n`));
  app.get('/sitemap.xml', async (req, res, next) => { try { res.type('application/xml').send(await seo.sitemap()); } catch (e) { next(e); } });

  /* ---------- static files ---------- */
  app.use('/uploads', express.static(config.uploadDir, { maxAge: '30d', fallthrough: false }));
  app.use(express.static(PUBLIC, { index: false, maxAge: config.isProd ? '1h' : 0 }));

  /* ---------- storefront pages (single-page app with server-rendered meta tags) ---------- */
  app.get(/^\/(?!api\/|uploads\/).*/, async (req, res, next) => {
    if (path.extname(req.path)) return res.status(404).send('Not found');
    try { res.type('html').set('Cache-Control', 'no-cache').send(await seo.render(req.path)); } catch (e) { next(e); }
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => { console.error(err); res.status(500).send('Server error'); });
  return app;
}

module.exports = { createApp };
