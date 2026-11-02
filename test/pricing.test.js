'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { unitPrice, etaLabel } = require('../server/pricing');

test('quote-only products have no price', () => {
  assert.strictEqual(unitPrice({ price: null }, 1), null);
  assert.strictEqual(unitPrice({ price: 1000, quote_only: true }, 1), null);
});
test('deal percentage rounds to Rs 10', () => {
  assert.strictEqual(unitPrice({ price: 4999 }, 1, { dealPct: 10 }), 4500);
});
test('quantity breaks apply at the threshold', () => {
  const p = { price: 1000, breaks: [[1, 1000], [10, 900], [50, 850]] };
  assert.strictEqual(unitPrice(p, 9), 1000);
  assert.strictEqual(unitPrice(p, 10), 900);
  assert.strictEqual(unitPrice(p, 60), 850);
});
test('dealer discount takes the lowest price', () => {
  assert.strictEqual(unitPrice({ price: 1000 }, 1, { dealPct: 5, dealerPct: 0.12 }), 880);
});
test('delivery never lands on Saturday', () => {
  for (let i = 0; i < 14; i++) assert.ok(!etaLabel(1, Date.UTC(2026, 10, 2 + i, 3)).startsWith('Sat'));
});
