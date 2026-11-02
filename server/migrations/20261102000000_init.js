'use strict';
/* Technotri Store schema. JSON values are kept in TEXT columns (parsed in code) for MySQL/MariaDB portability. */

exports.up = async function (knex) {
  await knex.schema.createTable('users', (t) => {
    t.increments('id');
    t.string('name', 120).notNullable();
    t.string('phone', 20).unique();
    t.string('email', 190).unique();
    t.string('password_hash', 100).notNullable();
    t.enu('role', ['customer', 'staff', 'admin']).notNullable().defaultTo('customer');
    t.enu('dealer_status', ['none', 'pending', 'approved', 'rejected']).notNullable().defaultTo('none');
    t.string('pan', 20);
    t.text('wishlist');
    t.boolean('active').notNullable().defaultTo(true);
    t.datetime('last_login_at');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('addresses', (t) => {
    t.increments('id');
    t.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE');
    t.string('city', 120).notNullable();
    t.string('ward', 120);
    t.string('street', 255).notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('categories', (t) => {
    t.string('id', 40).primary();
    t.string('name', 120).notNullable();
    t.string('pillar', 20);
    t.string('art', 40);
    t.string('blurb', 255);
    t.text('subs');
    t.text('facets');
    t.decimal('dealer_pct', 5, 4).notNullable().defaultTo(0.1);
    t.integer('sort').notNullable().defaultTo(0);
  });

  await knex.schema.createTable('products', (t) => {
    t.string('id', 60).primary();
    t.string('cat_id', 40).notNullable().references('categories.id');
    t.string('sub', 120).notNullable();
    t.string('brand', 120).notNullable();
    t.string('model', 120);
    t.string('name', 255).notNullable();
    t.string('art', 40).defaultTo('kit');
    t.integer('price').unsigned(); // NPR incl. VAT; NULL = quote only
    t.integer('mrp').unsigned();
    t.boolean('quote_only').notNullable().defaultTo(false);
    t.integer('stock').notNullable().defaultTo(0);
    t.text('tags');
    t.text('highlights');
    t.text('specs');
    t.text('builder');
    t.text('lab');
    t.decimal('serviceability', 3, 1);
    t.string('warranty', 120);
    t.decimal('rating_base_avg', 3, 2).notNullable().defaultTo(0);
    t.integer('rating_base_count').notNullable().defaultTo(0);
    t.text('breaks');
    t.text('fbt');
    t.boolean('active').notNullable().defaultTo(true);
    t.integer('sort').notNullable().defaultTo(0);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.timestamp('updated_at').defaultTo(knex.fn.now());
    t.index(['cat_id', 'active']);
  });

  await knex.schema.createTable('product_images', (t) => {
    t.increments('id');
    t.string('product_id', 60).notNullable().references('products.id').onDelete('CASCADE');
    t.string('url', 255).notNullable();
    t.integer('sort').notNullable().defaultTo(0);
  });

  await knex.schema.createTable('reviews', (t) => {
    t.increments('id');
    t.string('product_id', 60).notNullable().references('products.id').onDelete('CASCADE');
    t.integer('user_id').unsigned().references('users.id').onDelete('SET NULL');
    t.string('name', 120).notNullable();
    t.tinyint('stars').notNullable();
    t.string('title', 120).notNullable();
    t.text('body').notNullable();
    t.boolean('verified').notNullable().defaultTo(false);
    t.boolean('seeded').notNullable().defaultTo(false); // part of the catalog's base rating
    t.enu('status', ['published', 'hidden']).notNullable().defaultTo('published');
    t.date('review_date').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index(['product_id', 'status']);
  });

  await knex.schema.createTable('questions', (t) => {
    t.increments('id');
    t.string('product_id', 60).notNullable().references('products.id').onDelete('CASCADE');
    t.integer('user_id').unsigned().references('users.id').onDelete('SET NULL');
    t.text('question').notNullable();
    t.text('answer');
    t.string('answered_by', 120);
    t.boolean('visible').notNullable().defaultTo(true);
    t.datetime('answered_at');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('zones', (t) => {
    t.string('id', 20).primary();
    t.string('name', 160).notNullable();
    t.integer('fee').notNullable();
    t.integer('days').notNullable();
    t.integer('free_over').notNullable();
    t.integer('sort').notNullable().defaultTo(0);
  });

  await knex.schema.createTable('coupons', (t) => {
    t.string('code', 30).primary();
    t.string('description', 255).notNullable();
    t.enu('type', ['pct', 'catpct', 'ship']).notNullable();
    t.decimal('value', 6, 2).notNullable().defaultTo(0);
    t.integer('cap');
    t.integer('min_subtotal');
    t.string('cat_id', 40);
    t.boolean('first_order_only').notNullable().defaultTo(false);
    t.boolean('active').notNullable().defaultTo(true);
    t.datetime('expires_at');
  });

  await knex.schema.createTable('deals', (t) => {
    t.increments('id');
    t.string('product_id', 60).notNullable().references('products.id').onDelete('CASCADE');
    t.integer('pct').notNullable();
    t.datetime('starts_at').notNullable();
    t.datetime('ends_at').notNullable();
    t.integer('sort').notNullable().defaultTo(0);
    t.index(['starts_at', 'ends_at']);
  });

  await knex.schema.createTable('orders', (t) => {
    t.increments('id');
    t.string('order_no', 24).notNullable().unique();
    t.integer('user_id').unsigned().references('users.id').onDelete('SET NULL');
    t.string('name', 120).notNullable();
    t.string('phone', 20).notNullable();
    t.string('email', 190);
    t.string('pan', 20);
    t.enu('method', ['ship', 'pickup']).notNullable();
    t.string('zone_id', 20);
    t.string('zone_name', 160);
    t.string('city', 120);
    t.string('ward', 120);
    t.string('street', 255);
    t.string('slot', 60);
    t.boolean('install').notNullable().defaultTo(false);
    t.text('notes');
    t.enu('pay_method', ['cod', 'bank']).notNullable();
    t.string('pay_status', 40).notNullable();
    t.enu('status', ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']).notNullable().defaultTo('placed');
    t.integer('items_total').notNullable();
    t.integer('protection').notNullable().defaultTo(0);
    t.integer('discount').notNullable().defaultTo(0);
    t.string('coupon', 30);
    t.integer('shipping').notNullable().defaultTo(0);
    t.integer('total').notNullable();
    t.decimal('taxable', 12, 2).notNullable();
    t.decimal('vat', 12, 2).notNullable();
    t.string('eta', 40);
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index(['status']);
    t.index(['phone']);
  });

  await knex.schema.createTable('order_items', (t) => {
    t.increments('id');
    t.integer('order_id').unsigned().notNullable().references('orders.id').onDelete('CASCADE');
    t.string('product_id', 60);
    t.string('name', 255).notNullable();
    t.string('model', 120);
    t.integer('qty').notNullable();
    t.integer('unit').notNullable();
    t.string('protection_name', 120);
    t.integer('protection_amt').notNullable().defaultTo(0);
  });

  await knex.schema.createTable('order_events', (t) => {
    t.increments('id');
    t.integer('order_id').unsigned().notNullable().references('orders.id').onDelete('CASCADE');
    t.string('status', 30).notNullable();
    t.string('note', 255);
    t.integer('by_user').unsigned();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('quotes', (t) => {
    t.increments('id');
    t.string('quote_no', 20).notNullable().unique();
    t.integer('user_id').unsigned().references('users.id').onDelete('SET NULL');
    t.string('name', 120).notNullable();
    t.string('org', 160);
    t.string('phone', 20).notNullable();
    t.string('email', 190);
    t.string('type', 80);
    t.string('location', 160);
    t.text('requirements');
    t.boolean('site_visit').notNullable().defaultTo(false);
    t.text('items');
    t.enu('status', ['new', 'quoted', 'won', 'closed']).notNullable().defaultTo('new');
    t.text('staff_note');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('service_requests', (t) => {
    t.increments('id');
    t.string('request_no', 20).notNullable().unique();
    t.string('order_no', 24);
    t.string('serial', 120).notNullable();
    t.string('name', 120).notNullable();
    t.string('phone', 20).notNullable();
    t.text('issue').notNullable();
    t.enu('status', ['new', 'in progress', 'resolved']).notNullable().defaultTo('new');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('dealer_applications', (t) => {
    t.increments('id');
    t.integer('user_id').unsigned().notNullable().references('users.id').onDelete('CASCADE');
    t.string('business', 160).notNullable();
    t.string('pan', 20).notNullable();
    t.string('type', 80);
    t.string('district', 80);
    t.text('note');
    t.enu('status', ['pending', 'approved', 'rejected']).notNullable().defaultTo('pending');
    t.integer('decided_by').unsigned();
    t.datetime('decided_at');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('newsletter', (t) => {
    t.string('email', 190).primary();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('stock_alerts', (t) => {
    t.increments('id');
    t.string('product_id', 60).notNullable().references('products.id').onDelete('CASCADE');
    t.string('contact', 190).notNullable();
    t.boolean('notified').notNullable().defaultTo(false);
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('settings', (t) => {
    t.string('key', 60).primary();
    t.text('value');
  });
};

exports.down = async function (knex) {
  for (const t of ['settings', 'stock_alerts', 'newsletter', 'dealer_applications', 'service_requests', 'quotes', 'order_events', 'order_items', 'orders', 'deals', 'coupons', 'zones', 'questions', 'reviews', 'product_images', 'products', 'categories', 'addresses', 'users']) {
    await knex.schema.dropTableIfExists(t);
  }
};
