'use strict';
// Used by `npx knex migrate:latest` and `npx knex seed:run`.
const config = require('./server/config');
module.exports = { development: config.db, production: config.db };
