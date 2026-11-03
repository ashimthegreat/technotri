'use strict';
/* Email-first accounts: optional mobile, email verification, password reset, Google and Facebook sign-in. */
exports.up = async function (knex) {
  await knex.schema.alterTable('users', (t) => {
    t.string('password_hash', 100).nullable().alter();
    t.datetime('email_verified_at');
    t.string('google_id', 64).unique();
    t.string('facebook_id', 64).unique();
  });
  // Staff accounts were created by the store owner; treat their emails as verified.
  await knex('users').whereIn('role', ['admin', 'staff']).whereNotNull('email').update({ email_verified_at: knex.fn.now() });
  await knex.schema.createTable('auth_tokens', (t) => {
    t.increments('id');
    t.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE');
    t.enu('kind', ['verify', 'reset']).notNullable();
    t.string('token_hash', 64).notNullable().unique();
    t.datetime('expires_at').notNullable();
    t.datetime('used_at');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('auth_tokens');
  await knex.schema.alterTable('users', (t) => { t.dropColumn('email_verified_at'); t.dropColumn('google_id'); t.dropColumn('facebook_id'); });
};
