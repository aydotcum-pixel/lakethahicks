'use strict';
// A small D1-compatible wrapper around node:sqlite, so the local Node server and the
// tests run exactly the same queries as Cloudflare D1. Not used on Cloudflare.
const { DatabaseSync } = require('node:sqlite');

class Stmt {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...args) { return new Stmt(this.db, this.sql, args); }
  _norm() { return this.args.map(a => (a === undefined ? null : typeof a === 'boolean' ? (a ? 1 : 0) : a)); }
  _named() {
    // D1 uses ?1, ?2 … numbered parameters; node:sqlite accepts the same syntax positionally.
    return this._norm();
  }
  async all() { const s = this.db.prepare(this.sql); return { results: s.all(...this._named()).map(r => ({ ...r })), success: true, meta: {} }; }
  async first(col) { const s = this.db.prepare(this.sql); const r = s.get(...this._named()); if (!r) return null; return col ? r[col] : { ...r }; }
  async run() { const s = this.db.prepare(this.sql); if (/\bRETURNING\b/i.test(this.sql)) { const rows = s.all(...this._named()); return { results: rows.map(r => ({ ...r })), success: true, meta: {} }; } const info = s.run(...this._named()); return { success: true, meta: { changes: info.changes } }; }
}

class D1Local {
  constructor(file) { this.db = new DatabaseSync(file); this.db.exec('PRAGMA journal_mode = WAL'); }
  prepare(sql) { return new Stmt(this.db, sql); }
  async batch(stmts) {
    this.db.exec('BEGIN');
    try {
      const out = [];
      for (const s of stmts) out.push(/^\s*(SELECT|WITH)/i.test(s.sql) || /\bRETURNING\b/i.test(s.sql) ? await s.all() : await s.run());
      this.db.exec('COMMIT');
      return out;
    } catch (e) { this.db.exec('ROLLBACK'); throw e; }
  }
  async exec(sql) { this.db.exec(sql); }
}

module.exports = { D1Local };
