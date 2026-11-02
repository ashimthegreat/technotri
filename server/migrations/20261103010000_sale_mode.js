'use strict';
/* Lets staff choose per product: sell online, or "Get quote" with the price hidden or shown as a guide. */
exports.up = async function (knex) {
  await knex.schema.alterTable('products', (t) => { t.boolean('show_price').notNullable().defaultTo(false); });
};
exports.down = async function (knex) {
  await knex.schema.alterTable('products', (t) => { t.dropColumn('show_price'); });
};
