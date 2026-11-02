'use strict';
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const env = (k, d) => (process.env[k] === undefined || process.env[k] === '' ? d : process.env[k]);
const isProd = env('NODE_ENV', 'development') === 'production';

const config = {
  isProd,
  port: Number(env('PORT', 3000)),
  siteUrl: env('SITE_URL', 'http://localhost:3000').replace(/\/$/, ''),
  jwtSecret: env('JWT_SECRET', isProd ? '' : 'dev-only-secret-change-me'),
  cookieSecure: env('COOKIE_SECURE', isProd ? 'true' : 'false') === 'true',
  uploadDir: path.resolve(__dirname, '..', env('UPLOAD_DIR', 'public/uploads')),
  db: {
    client: 'mysql2',
    connection: {
      host: env('DB_HOST', '127.0.0.1'),
      port: Number(env('DB_PORT', 3306)),
      user: env('DB_USER', 'technotri'),
      password: env('DB_PASSWORD', ''),
      database: env('DB_NAME', 'technotri'),
      charset: 'utf8mb4',
      dateStrings: true,
      timezone: 'Z'
    },
    pool: { min: 0, max: Number(env('DB_POOL_MAX', 5)) },
    migrations: { directory: path.join(__dirname, 'migrations'), tableName: 'knex_migrations' },
    seeds: { directory: path.join(__dirname, 'seeds') }
  },
  smtp: {
    host: env('SMTP_HOST', ''),
    port: Number(env('SMTP_PORT', 465)),
    secure: env('SMTP_SECURE', 'true') === 'true',
    user: env('SMTP_USER', ''),
    pass: env('SMTP_PASSWORD', ''),
    from: env('MAIL_FROM', 'Technotri Store <info@technotri.com.np>'),
    notify: env('ORDER_NOTIFY_EMAIL', '')
  },
  seo: { google: env('GOOGLE_SITE_VERIFICATION', ''), bing: env('BING_SITE_VERIFICATION', ''), ga4: env('GA4_ID', '') },
  admin: { email: env('ADMIN_EMAIL', ''), password: env('ADMIN_PASSWORD', ''), name: env('ADMIN_NAME', 'Store Admin') }
};

if (isProd && (!config.jwtSecret || config.jwtSecret.length < 32)) {
  throw new Error('JWT_SECRET must be set to a random string of at least 32 characters in production.');
}

module.exports = config;
