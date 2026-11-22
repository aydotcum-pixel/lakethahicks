-- Node app port migration (2026-11-22): run ONCE on the live D1 database
-- laketha-posts, after the d1-setup.sql tables already exist.
-- d1-setup.sql now creates these columns/tables for fresh installs;
-- this file brings the live database up to the same shape.
-- Run in the Cloudflare Dashboard D1 console, one statement at a time.
ALTER TABLE posts ADD COLUMN tag TEXT NOT NULL DEFAULT 'Faith';
ALTER TABLE posts ADD COLUMN excerpt TEXT NOT NULL DEFAULT '';
ALTER TABLE posts ADD COLUMN pullQuote TEXT NOT NULL DEFAULT '';
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
