-- Laketha Hicks site: D1 schema. The site also creates these tables itself on first
-- request, so running this file is optional:
--   npx wrangler d1 execute laketha-hicks-site --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS docs (name TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0, updated_at TEXT);
CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, at TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS subscribers (email TEXT PRIMARY KEY, name TEXT, source TEXT, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, n INTEGER NOT NULL, reset INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS uploads (name TEXT PRIMARY KEY, type TEXT NOT NULL, data TEXT NOT NULL, at TEXT NOT NULL);
