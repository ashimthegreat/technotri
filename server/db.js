'use strict';
const knex = require('knex');
const config = require('./config');

const db = knex(config.db);

/** JSON helpers: columns are stored as TEXT so the schema works on MySQL 5.7+ and MariaDB alike. */
const toJson = (v) => (v === undefined || v === null ? null : JSON.stringify(v));
const fromJson = (s, fallback = null) => {
  if (s === null || s === undefined || s === '') return fallback;
  if (typeof s === 'object') return s;
  try { return JSON.parse(s); } catch { return fallback; }
};
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

module.exports = { db, toJson, fromJson, now };
