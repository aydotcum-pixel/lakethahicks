# Laketha Hicks: author website, journal and writing studio

Runs on **Cloudflare Workers** with a **D1** database. No dependencies.

## What's where

| Path | What it is |
|---|---|
| `worker.js` | Cloudflare entry point |
| `lib/app.js` | Every page, API and studio route (one fetch handler) |
| `lib/views.js`, `lib/admin-views.js` | Public pages and the writing studio |
| `lib/store.js` | Database (D1): posts, studio login, sessions, inbox, reader circle, photos, butterfly count |
| `lib/auth.js` | Studio sign-in (PBKDF2 passwords, HttpOnly session cookie, CSRF, rate limits) |
| `content/` | Site text, the 30 devotional days, Laketha's journal posts (seeded on first run) |
| `lib/bundle.js` | Generated from `content/` + monogram SVGs. Run `npm run bundle` after editing them |
| `public/` | CSS, JS, photos, covers, logo (served by Cloudflare directly) |
| `wrangler.jsonc` | Cloudflare settings: Worker name, D1 binding, variables |
| `server.js` | Local copy of the site on Node 22+, using a local SQLite file in place of D1 |

## Run it locally

```bash
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' npm start
# http://localhost:3000   ·   studio: http://localhost:3000/admin
npm test                    # 46 end-to-end checks
```

## Deploy

Connected to Cloudflare Workers Builds: every push to the deploy branch goes live.
Manual deploy: `npm run deploy` (needs `npx wrangler login` once).

Variables in `wrangler.jsonc`:
- `SITE_URL`: the public address (used in links shared on social media, RSS, sitemap)
- `SITE_TZ`: Laketha's time zone (chooses "Today's word")
- `NOINDEX`: `"1"` keeps search engines out during the preview. Set `"0"` at launch.

## House rules for anyone editing this site

- Never invent reviews, testimonials, ratings, prices, event dates or biography.
- Laketha's journal posts are her own words; keep them verbatim.
- Speaking topics, FAQ answers and the devotional draft (`needsApproval` in `content/site-content.json`) wait for Laketha's approval.
- Blue and butterflies are the brand. The gold butterfly on the monogram comes from her original logo.
