// server/src/db.js
import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "..", "game.db");

const sqlite = sqlite3.verbose();
export const db = new sqlite.Database(dbPath);

// init tables
db.serialize(() => {
  // Enforce foreign keys (needed for ON DELETE CASCADE)
  db.run(`PRAGMA foreign_keys = ON;`);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE,
      name TEXT,
      class TEXT,
      background TEXT,
      goal TEXT,
      alignment TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS turns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      role TEXT,
      content TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Helpful index for per-session history lookups
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_turns_session_id
    ON turns (session_id, created_at);
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS state (
      session_id TEXT PRIMARY KEY,
      location TEXT,
      health INTEGER,
      mana INTEGER,
      gold INTEGER,
      inventory TEXT
    )
  `);

  // ==================================================
  // LORE TREE (Admin-authored)
  // ==================================================
  // Matches adminLoreRoutes.js expectations:
  // id, parent_id, title, content, position, created_at, updated_at
  db.run(`
    CREATE TABLE IF NOT EXISTS lore_nodes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parent_id INTEGER NULL,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES lore_nodes(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE INDEX IF NOT EXISTS idx_lore_nodes_parent_position
    ON lore_nodes (parent_id, position, id);
  `);
});

/**
 * Promise wrapper helpers for common DB operations
 */

export function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this); // lastID, changes
    });
  });
}

export function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

export function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

/**
 * Convenience helpers used by server/game logic and admin controllers
 */

export async function getTurnsForSession(sessionId, limit = 20) {
  const rows = await allAsync(
    `SELECT role, content, created_at FROM turns WHERE session_id = ? ORDER BY id DESC LIMIT ?`,
    [sessionId, limit]
  );
  return rows.reverse();
}

export async function deleteSession(sessionId) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("DELETE FROM turns WHERE session_id = ?", [sessionId]);
      db.run("DELETE FROM state WHERE session_id = ?", [sessionId]);
      db.run("DELETE FROM players WHERE session_id = ?", [sessionId]);
      db.run("DELETE FROM sessions WHERE id = ?", [sessionId], function (err) {
        if (err) return reject(err);
        resolve({ ok: true, changes: this.changes });
      });
    });
  });
}

export async function deleteAllSessions() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run("DELETE FROM turns");
      db.run("DELETE FROM state");
      db.run("DELETE FROM players");
      db.run("DELETE FROM sessions", function (err) {
        if (err) return reject(err);
        resolve({ ok: true, changes: this.changes });
      });
    });
  });
}