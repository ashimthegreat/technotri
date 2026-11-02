'use strict';
const config = require('./config');
const { createApp } = require('./app');
const { db } = require('./db');

async function start() {
  if (process.env.AUTO_MIGRATE !== 'false') {
    // Applies any new schema changes on start-up (handy on cPanel where there is no deploy hook).
    const [, applied] = await db.migrate.latest();
    if (applied.length) console.log('Applied migrations:', applied.join(', '));
  }
  const app = createApp();
  app.listen(config.port, () => console.log(`Technotri Store listening on ${config.port} (${config.isProd ? 'production' : 'development'})`));
}

start().catch((e) => { console.error('Failed to start:', e); process.exit(1); });
