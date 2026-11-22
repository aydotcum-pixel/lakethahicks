-- Laketha Hicks D1 setup: laketha-posts
-- Run with: wrangler d1 execute laketha-posts --remote --file=d1-setup.sql
-- Or paste into the Cloudflare Dashboard D1 console for laketha-posts.
-- This file creates tables and seeds the three starter posts.
-- It does NOT create the admin user. Seed the admin user separately
-- with seed-admin.mjs, using the password supplied only at run time.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  csrf_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  post_date TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT 'Faith',
  excerpt TEXT NOT NULL DEFAULT '',
  pullQuote TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  email TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (email, ip_hash)
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL DEFAULT 'Message',
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  gathering TEXT NOT NULL DEFAULT '',
  group_name TEXT NOT NULL DEFAULT '',
  date_text TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS subscribers (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'site',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT 0
);

INSERT INTO posts (slug, title, body, post_date, status, created_at, updated_at) VALUES ('faith-for-the-season-you-are-in', 'Faith for the Season You Are In', 'I have learned that faith is not only for the days when the answer is clear. Faith is for the mornings when you pray and still have to wait. It is for the hospital corridor and the quiet kitchen, for the moments when nobody sees you holding it together but God.

There were seasons when I wanted God to move quickly, and instead He taught me to stand firmly. Standing is still faith. Waiting is still faith. Getting up one more time and doing the next right thing, that is faith too.

If you are in a waiting season, I want you to hear this from my heart. God has not forgotten you. The silence is not absence. Keep praying, keep serving, keep believing, and watch how He meets you, one honest step at a time.', '2026-11-12', 'published', 1792512000000, 1792512000000);
INSERT INTO posts (slug, title, body, post_date, status, created_at, updated_at) VALUES ('beginning-again-is-not-failure', 'Beginning Again Is Not Failure', 'Beginning again does not mean you failed. It means you lived. It means you learned some things the hard way, and by grace you still have breath in your body and courage in your heart to start where you are.

I know what it is to look at a chapter and wish you could rewrite it. You cannot go back, but you can begin again, wiser this time, softer in the right places and stronger in the places that matter. A new beginning rarely looks grand. Most days it looks like one small faithful choice, and then another.

So do not let shame name your next chapter. Let faith name it. You are not starting from nothing. You are starting from experience, and God is able to make even that fruitful.', '2026-10-28', 'published', 1792512000000, 1792512000000);
INSERT INTO posts (slug, title, body, post_date, status, created_at, updated_at) VALUES ('why-i-wrote-redemption-and-redemptions-journey', 'Why I Wrote Redemption and Redemptions Journey', 'I wrote Redemption: The Story of a Woman because I knew I was not the only woman who had been broken by a season and wondered whether God could put her life back together. That first book is the story. It tells the truth about the breaking, and it tells the truth about the grace that met me there.

Redemptions Journey came two years later because I learned that being set free is only the beginning. After the rescue comes the walk. After the tears come the daily choices. The second book is for the woman who survived the hard chapter and now asks, Lord, how do I live free, day by day?

If my books do anything, I pray they sit with a woman the way a good friend would, honest and kind, and remind her that her story is not over. There is more to your story, and God is still writing.', '2026-10-14', 'published', 1792512000000, 1792512000000);
