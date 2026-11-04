-- raided.cc initial schema (Cloudflare D1 / SQLite)
-- Section 1 matches Better Auth's core tables + the username plugin.
-- Section 2 is the app's own data.

-- ============ 1. AUTH (Better Auth) ============

CREATE TABLE "user" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "name"            TEXT NOT NULL,
  "email"           TEXT NOT NULL UNIQUE,
  "emailVerified"   INTEGER NOT NULL DEFAULT 0,
  "image"           TEXT,
  "createdAt"       DATE NOT NULL,
  "updatedAt"       DATE NOT NULL,
  "username"        TEXT UNIQUE,
  "displayUsername" TEXT
);

CREATE TABLE "session" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "expiresAt" DATE NOT NULL,
  "token"     TEXT NOT NULL UNIQUE,
  "createdAt" DATE NOT NULL,
  "updatedAt" DATE NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId"    TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);
CREATE INDEX "session_userId_idx" ON "session"("userId");

CREATE TABLE "account" (
  "id"                    TEXT NOT NULL PRIMARY KEY,
  "accountId"             TEXT NOT NULL,
  "providerId"            TEXT NOT NULL,
  "userId"                TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "accessToken"           TEXT,
  "refreshToken"          TEXT,
  "idToken"               TEXT,
  "accessTokenExpiresAt"  DATE,
  "refreshTokenExpiresAt" DATE,
  "scope"                 TEXT,
  "password"              TEXT,
  "createdAt"             DATE NOT NULL,
  "updatedAt"             DATE NOT NULL
);
CREATE INDEX "account_userId_idx" ON "account"("userId");

CREATE TABLE "verification" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value"      TEXT NOT NULL,
  "expiresAt"  DATE NOT NULL,
  "createdAt"  DATE NOT NULL,
  "updatedAt"  DATE NOT NULL
);
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- ============ 2. APP DATA ============

-- Invite-only signup. A code is "used" once used_by is set.
CREATE TABLE invites (
  code       TEXT PRIMARY KEY,
  created_by TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  used_by    TEXT REFERENCES "user"("id") ON DELETE SET NULL,
  used_at    INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- One row per user. pfp/background hold the R2 object key, not a URL.
-- settings is a JSON blob (name effects, colors, etc.) so new options
-- don't need a migration every time.
CREATE TABLE profiles (
  user_id        TEXT PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  bio            TEXT NOT NULL DEFAULT '',
  avatar_key     TEXT,
  background_key TEXT,
  layout         TEXT NOT NULL DEFAULT 'minimal' CHECK (layout IN ('minimal', 'card')),
  settings       TEXT NOT NULL DEFAULT '{}',
  created_at     INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at     INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE links (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  platform   TEXT NOT NULL,
  url        TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);
CREATE INDEX links_user_idx ON links(user_id, position);
