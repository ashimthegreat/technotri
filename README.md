# Technotri Store

Online store for **Technotri Pvt. Ltd.** (technotri.com.np). It sells solar energy, backup power, connectivity, ISP/FTTH supplies and parts in Nepal.

One Node.js app serves both the storefront and the API, with a MySQL database behind it. It is built to run on **cPanel shared hosting** (Setup Node.js App + MySQL). See [DEPLOY-CPANEL.md](DEPLOY-CPANEL.md).

## What's included

**Storefront** (`public/`, plain JavaScript single-page app with real URLs such as `/p-mu-10` and `/c-solar`)
- Catalogue with category pages, filters, search with suggestions, product pages, compare, wishlist, recently viewed.
- Daily deals, quantity price breaks, coupons, and protection plans on items of Rs 5,000 or more.
- Cart and checkout. Payment is **cash on delivery** or **bank transfer**. Customers choose a delivery zone or store pickup, and see an ETA in Nepal time.
- Order confirmation with a VAT invoice (13% included). Order tracking by order number and phone. Cancellation while an order is still placed or confirmed.
- Customer accounts: profile, saved addresses, order history, password change.
- Dealer/installer application. Approved dealers see category discounts.
- B2B quote requests, a System Builder for sizing solar and backup, ready kits, guides, reviews and Q&A, and warranty/service requests.

**Staff admin** (`/admin`, needs a staff or admin login)
- Dashboard: revenue chart, pending work, low stock.
- Products: inline price, stock and visibility edits; full product editor; photo upload.
- Orders: status workflow, marking bank transfers as paid, CSV export.
- Quotes, service requests, dealer approvals, review moderation, answering questions.
- Deals scheduler, coupons, delivery zones, company/invoice details, customer roles and staff logins.

**Server** (`server/`)
- Express 5, knex + mysql2, migrations and seed data.
- Prices are computed on the server; the server is authoritative for every total that is charged. Stock is checked and decremented inside a transaction.
- Auth uses bcrypt password hashes and a JWT in an httpOnly cookie. CSRF is blocked with a required request header. Login and forms are rate-limited. Security headers come from helmet (CSP).
- SEO: each URL gets server-rendered title, description, Open Graph tags and Product JSON-LD. `sitemap.xml` and `robots.txt` are generated.
- Optional SMTP email for order confirmations, status changes and dealer decisions.

## Run it locally

You need Node 18.18+ and MySQL 8 or MariaDB 10.6+.

```bash
cp .env.example .env          # then fill in DB_* and ADMIN_* (set NODE_ENV=development locally)
npm install
npm run setup                 # create tables + load the catalogue + create the admin from ADMIN_*
npm run dev                   # http://localhost:3000
npm test                      # pricing unit tests
```

To add another staff login later, run `npm run create-admin -- email@example.com "Full Name" [password] [admin|staff]`.

## Layout

```
app.js                 entry point (cPanel "Application startup file")
server/                Express app, routes, pricing, auth, SEO, migrations, seeds
server/data/           catalogue seed data
public/                storefront + admin (static files served by the app)
public/uploads/        product photos uploaded from the admin (not in git)
scripts/               create-admin
test/                  node:test unit tests
```
