-- D1 schema for the membership system. Run once in the Cloudflare dashboard (D1 -> kalimba-members -> Console), or: wrangler d1 execute kalimba-members --file=schema.sql
CREATE TABLE IF NOT EXISTS users (
  sub TEXT PRIMARY KEY,            -- Google account id
  email TEXT NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  last_login INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS users_email ON users(email);

-- one row per member email; `until` NULL = lifetime, otherwise epoch ms
CREATE TABLE IF NOT EXISTS members (
  email TEXT PRIMARY KEY,          -- lower-case
  until INTEGER,
  plan TEXT NOT NULL DEFAULT 'manual',
  source TEXT NOT NULL DEFAULT 'admin',
  note TEXT,
  updated_at INTEGER NOT NULL
);

-- only a SHA-256 of the session token is stored
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  sub TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_exp ON sessions(expires_at);
