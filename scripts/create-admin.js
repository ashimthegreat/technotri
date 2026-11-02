'use strict';
/* Create or reset a staff/admin login:  node scripts/create-admin.js you@example.com "Your Name" [password] [admin|staff] */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { db } = require('../server/db');

(async () => {
  const [email, name = 'Store Admin', given, role = 'admin'] = process.argv.slice(2);
  if (!email || !email.includes('@')) { console.log('Usage: node scripts/create-admin.js email "Name" [password] [admin|staff]'); process.exit(1); }
  const password = given || crypto.randomBytes(9).toString('base64url');
  const hash = await bcrypt.hash(password, 10);
  const existing = await db('users').where({ email: email.toLowerCase() }).first();
  if (existing) await db('users').where({ id: existing.id }).update({ password_hash: hash, role, active: true });
  else await db('users').insert({ name, email: email.toLowerCase(), password_hash: hash, role });
  console.log(`${existing ? 'Updated' : 'Created'} ${role} ${email}${given ? '' : `  password: ${password}`}`);
  await db.destroy();
})().catch(async (e) => { console.error(e.message); await db.destroy(); process.exit(1); });
