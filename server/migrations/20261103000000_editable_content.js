'use strict';
/* Moves guides, kits, FAQ, home slides and site text into the database so staff can edit them in the admin. */
const defaults = require('../data/content-defaults');

exports.up = async function (knex) {
  await knex.schema.alterTable('settings', (t) => { t.specificType('value', 'mediumtext').alter(); });
  const put = async (key, value) => {
    const has = await knex('settings').where({ key }).first();
    if (!has) await knex('settings').insert({ key, value: JSON.stringify(value) });
  };
  await put('guides', defaults.GUIDES);
  await put('kits', defaults.KITS);
  await put('faq', defaults.FAQ);
  await put('slides', defaults.SLIDES);
  await put('site', defaults.SITE);
  await knex.schema.alterTable('order_events', (t) => { t.string('kind', 20).notNullable().defaultTo('status'); });
};

exports.down = async function (knex) {
  await knex('settings').whereIn('key', ['guides', 'kits', 'faq', 'slides', 'site']).del();
  await knex.schema.alterTable('order_events', (t) => { t.dropColumn('kind'); });
  await knex.schema.alterTable('settings', (t) => { t.text('value').alter(); });
};
