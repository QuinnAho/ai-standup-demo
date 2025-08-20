import Database from "better-sqlite3";
export const db = new Database("./data.db");
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS repos (
  id INTEGER PRIMARY KEY,
  owner TEXT NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(owner, name)
);

CREATE TABLE IF NOT EXISTS users (
  login TEXT PRIMARY KEY,
  display_name TEXT
);

CREATE TABLE IF NOT EXISTS commits (
  id TEXT PRIMARY KEY,        -- commit url or sha
  repo_owner TEXT, repo_name TEXT,
  author_login TEXT,
  ts TEXT,                    -- ISO timestamp
  message TEXT,
  url TEXT
);

CREATE TABLE IF NOT EXISTS pull_requests (
  id INTEGER PRIMARY KEY,     -- PR number scoped by repo
  repo_owner TEXT, repo_name TEXT,
  author_login TEXT,
  created_at TEXT, merged_at TEXT, closed_at TEXT,
  additions INTEGER, deletions INTEGER,
  title TEXT, url TEXT
);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,        -- comment url or node id
  repo_owner TEXT, repo_name TEXT,
  parent_type TEXT, parent_ref TEXT,
  author_login TEXT,
  ts TEXT,
  body TEXT,
  url TEXT
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT,                  -- 'standup' | 'retro'
  repo_owner TEXT, repo_name TEXT,
  window_start TEXT, window_end TEXT,
  body_md TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`);
