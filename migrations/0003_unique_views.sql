-- One row per (profile, visitor). Visitors are stored as a salted hash of
-- their IP, never the raw address. The primary key is what stops a refresh
-- from counting again.
CREATE TABLE profile_views (
  user_id    TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  ip_hash    TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (user_id, ip_hash)
);
