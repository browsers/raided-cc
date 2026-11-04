-- Sequential public UID: first account is 1, then 2, 3, ...
-- AUTOINCREMENT means a deleted account's number is never handed out again.
CREATE TABLE user_uids (
  uid     INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE
);

-- Backfill: existing accounts get their number in signup order.
INSERT INTO user_uids (user_id)
SELECT "id" FROM "user" ORDER BY "createdAt" ASC, rowid ASC;
