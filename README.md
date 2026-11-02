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

**Staff admin** (`/admin`, needs a staff or admin login). Everything customers see is managed here, with no code changes:
- **Overview:** revenue chart, work waiting (new orders, quotes, dealer applications, questions), low stock.
- **Orders:** list, filters and CSV export. Each order has its own page: items, status changes with a customer-visible note, internal notes, payment status (mark bank transfers paid), editing the delivery address and contact, and a full timeline.
- **Products:** choose per product how customers buy it: *Buy online* (price and Add to cart), *Get quote, hide price*, or *Get quote, show guide price*; switch a whole category or sub-category at once. Inline price, stock and visibility edits; full editor (specs, highlights, tags, quantity prices, frequently-bought-together, illustration, list position); photo upload. Bulk price and stock updates by downloading the list as CSV, editing it in Excel or Google Sheets, and uploading it.
- **Categories:** add, rename, reorder and delete; sub-categories; colour; dealer discount per category.
- **Deals and coupons:** schedule deals, auto-fill 30 days, create, edit, switch off or expire coupons.
- **Website content:** home-page banners, guides (with a simple text editor), ready kits, help FAQ, announcement bar, newsletter text, bank transfer details, return window, and the home page's Google title and description.
- **Customers and staff:** customer pages with orders, addresses and dealer status; password reset; roles; disabling accounts; new staff logins.
- **Dealers, quotes and service requests, reviews and Q&A** (answer, hide or delete).
- **Subscribers and alerts:** newsletter list (CSV) and back-in-stock requests.
- **Delivery and settings:** delivery zones (add, edit, remove), company details used on invoices, extended warranty plans, daily-deal rotation.

Staff can do day-to-day work. Only admins can change categories, company details, warranty plans and the deal rotation, add or remove delivery zones, and change roles and passwords.

**Server** (`server/`)
- Express 5, knex + mysql2, migrations and seed data.
- Prices are computed on the server; the server is authoritative for every total that is charged. Stock is checked and decremented inside a transaction.
- Auth uses bcrypt password hashes and a JWT in an httpOnly cookie. CSRF is blocked with a required request header. Login and forms are rate-limited. Security headers come from helmet (CSP).
- SEO (`server/seo.js`): every URL is answered with real HTML, so crawlers that don't run JavaScript still see a full page:
  - per-page title, description, canonical and robots; correct 404s; noindex on cart, account and admin pages
  - Open Graph and X cards with 1200×630 share images
  - schema.org JSON-LD: Organization/ElectronicsStore, WebSite search, Product with Offer (NPR price, stock, shipping, 7-day return policy) and genuine reviews only, BreadcrumbList, CollectionPage, Article/HowTo, FAQPage
  - a server-rendered copy of the page content (headings, prices, specs, internal links)
  - `sitemap.xml` with lastmod and images; `robots.txt`; a Google Merchant / Facebook catalogue feed at `/feed/google.xml`
  - one canonical host, no trailing slashes, long-cache versioned assets
  - optional Search Console, Bing and GA4 tags via environment variables
  - `npm run build:images` re-renders the product and share images in `public/img/` (needs Playwright; the output is committed)
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

Before launch, run `npm run clear-sample-reviews` to remove the demo catalogue's sample ratings.

To add another staff login later, run `npm run create-admin -- email@example.com "Full Name" [password] [admin|staff]`.

## Layout

```
app.js                 entry point (cPanel "Application startup file")
server/                Express app, routes, pricing, auth, SEO, migrations, seeds
server/data/           catalogue seed data and default website content
public/                storefront + admin (static files served by the app)
public/uploads/        product photos uploaded from the admin (not in git)
scripts/               create-admin
test/                  node:test unit tests
```
