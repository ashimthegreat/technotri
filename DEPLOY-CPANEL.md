# Deploying Technotri Store on cPanel

These steps fit cPanel hosts that offer **Setup Node.js App** (CloudLinux / Passenger) and **MySQL Databases**. Most Nepali hosts that sell "Node.js hosting" use this setup. Plan on about 20 minutes.

## 1. Create the database

1. Open cPanel, then **MySQL® Databases**.
2. Create a database, for example `technotri_store`. cPanel adds your account prefix, so it becomes something like `cpuser_technotri_store`.
3. Create a user with a long random password, for example `cpuser_ttapp`.
4. Under **Add User To Database**, pick that user and database and tick **ALL PRIVILEGES**.

Write down the full database name, the user name and the password.

## 2. Get the code onto the server

**Option A: Git (recommended).** Open **Git™ Version Control**, then **Create**.
- Clone URL: `https://github.com/ashimthegreat/technotri.git`. For a private repo, use a GitHub fine-grained token, or add the server's SSH key as a deploy key and use the SSH URL.
- Repository path: `/home/<cpuser>/technotri`.

To update later, open the repo there and click **Pull or Deploy → Update from Remote**, then restart the app (step 6).

**Option B: Upload.** Download the repo as a ZIP from GitHub. Upload it with **File Manager** to `/home/<cpuser>/technotri` and extract it.

## 3. Create the Node.js app

Open **Setup Node.js App**, then **Create Application**:

| Field | Value |
|---|---|
| Node.js version | 20.x (or 18.18+) |
| Application mode | Production |
| Application root | `technotri` |
| Application URL | `technotri.com.np` (leave the path empty) |
| Application startup file | `app.js` |

Click **Create**.

## 4. Environment variables

In the same screen, add these under **Environment variables**. They are the same keys as in `.env.example`.

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `SITE_URL` | `https://technotri.com.np` |
| `DB_HOST` | `localhost` |
| `DB_NAME` | `cpuser_technotri_store` |
| `DB_USER` | `cpuser_ttapp` |
| `DB_PASSWORD` | the database password |
| `JWT_SECRET` | a random string of 40+ characters (see below) |
| `ADMIN_EMAIL` | your admin login email |
| `ADMIN_NAME` | e.g. `Store Admin` |
| `ADMIN_PASSWORD` | a strong password, 8+ characters |

To make a random secret, run this in cPanel **Terminal**:
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Optional email settings use your cPanel mailbox: `SMTP_HOST` (mail.technotri.com.np), `SMTP_PORT` (465), `SMTP_SECURE` (true), `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`, and `ORDER_NOTIFY_EMAIL` (where new-order alerts go).

Instead of the form, you can create a `.env` file in the app root with the same keys. It is ignored by git.

Click **Save**.

## 5. Install and set up the database

1. In **Setup Node.js App**, click **Run NPM Install**.
2. Copy the command shown at the top of the page, which starts with `source /home/<cpuser>/nodevenv/...`.
3. Open **Terminal** in cPanel (or SSH in) and run:

```bash
source /home/<cpuser>/nodevenv/technotri/20/bin/activate && cd /home/<cpuser>/technotri
npm run setup
```

This creates all tables, loads the product catalogue, and creates the admin login from `ADMIN_EMAIL` and `ADMIN_PASSWORD`. It is safe to run again: the catalogue is only loaded the first time.

If your host has no Terminal, skip this step. The app creates the tables itself when it starts. Then run the seed once from **Run JS script → setup**, if your cPanel shows that button.

## 6. Start it

Click **Restart** in **Setup Node.js App**, then open https://technotri.com.np.

- Health check: `https://technotri.com.np/api/health` should return `{"ok":true}`.
- Staff admin: sign in at `/signin` with the admin email and password, then go to `/admin`.

## 7. HTTPS and final checks

- **SSL/TLS Status → Run AutoSSL**, so the site loads over https. Login cookies are marked secure in production, so sign-in **only works over https**.
- Make sure `public/uploads` is writable. It normally is; if photo upload fails, set it to 755 in File Manager.
- In the admin under **Delivery & settings**, check the company details printed on invoices and add your bank account details for bank-transfer orders.
- Place one test order with cash on delivery. Mark it delivered in **Admin → Orders**. Check that the stock went down.
- Submit `https://technotri.com.np/sitemap.xml` in Google Search Console.

## Updating

```bash
# in cPanel Git Version Control: Update from Remote, then in Terminal:
source /home/<cpuser>/nodevenv/technotri/20/bin/activate && cd /home/<cpuser>/technotri
npm install --omit=dev
```

Then click **Restart** in Setup Node.js App. New database migrations run automatically on start. Set `AUTO_MIGRATE=false` to turn that off and run `npm run migrate` yourself.

## Troubleshooting

- **503 or "Incomplete response"**: open `stderr.log` in the app root. The usual causes are wrong `DB_*` values or a missing `JWT_SECRET`. The app refuses to start in production without a secret.
- **"Access denied for user"**: the user was not added to the database with ALL PRIVILEGES, or the cPanel prefix is missing from the name.
- **Can't stay signed in**: the site is being opened over http. Enable SSL, or temporarily set `COOKIE_SECURE=false`.
- **Photos disappear after a redeploy**: they live in `public/uploads`, which is not in git. Back that folder up along with the database (cPanel **Backup**).
