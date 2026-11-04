-- Page view counter shown on public profiles (raided.cc/<username>).
ALTER TABLE profiles ADD COLUMN views INTEGER NOT NULL DEFAULT 0;
