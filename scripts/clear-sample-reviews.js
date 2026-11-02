'use strict';
/*
 * Removes the sample ratings and reviews that ship with the demo catalogue, so the store only shows
 * reviews from real customers. Run once before launch:  npm run clear-sample-reviews
 * (Showing invented ratings is misleading to customers and breaks Google's review guidelines.)
 */
const { db } = require('../server/db');
(async () => {
  const removed = await db('reviews').where({ seeded: true }).del();
  const reset = await db('products').update({ rating_base_avg: 0, rating_base_count: 0 });
  console.log(`Removed ${removed} sample reviews and reset the starting rating on ${reset} products.`);
  await db.destroy();
})().catch((e) => { console.error(e); process.exit(1); });
