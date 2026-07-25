-- +goose Up
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS web_sessions (
  id TEXT PRIMARY KEY,
  created_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS web_connection_secrets (
  session_id TEXT NOT NULL,
  connection_id INTEGER NOT NULL,
  ciphertext TEXT NOT NULL,
  remember INTEGER NOT NULL DEFAULT 0,
  expires_at DATETIME,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY(session_id, connection_id),
  FOREIGN KEY(connection_id) REFERENCES connections(id) ON DELETE CASCADE,
  FOREIGN KEY(session_id) REFERENCES web_sessions(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_web_connection_secrets_expires_at ON web_connection_secrets(expires_at);

-- +goose Down
DROP TABLE IF EXISTS web_connection_secrets;
DROP TABLE IF EXISTS web_sessions;

