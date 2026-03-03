-- +goose Up
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS cache_items (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expiration INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id TEXT NOT NULL DEFAULT 'desktop',
  name TEXT NOT NULL,
  connection_type TEXT NOT NULL,
  options TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 0,
  version TEXT,
  created_at DATETIME,
  updated_at DATETIME
);
CREATE INDEX IF NOT EXISTS idx_connections_owner_id ON connections(owner_id);

CREATE TABLE IF NOT EXISTS histories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connection_id INTEGER NOT NULL,
  query TEXT,
  created_at DATETIME,
  FOREIGN KEY(connection_id) REFERENCES connections(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_histories_connection_id ON histories(connection_id);

CREATE TABLE IF NOT EXISTS saved_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connection_id INTEGER NOT NULL,
  name TEXT,
  query TEXT,
  created_at DATETIME,
  updated_at DATETIME,
  FOREIGN KEY(connection_id) REFERENCES connections(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_saved_queries_connection_id ON saved_queries(connection_id);

CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  error TEXT,
  data TEXT,
  result TEXT,
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME,
  updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS ai_providers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  url TEXT,
  api_key TEXT,
  timeout INTEGER,
  models TEXT,
  is_active INTEGER NOT NULL DEFAULT 0,
  model TEXT,
  last_model_list_updated_at DATETIME,
  last_used_at DATETIME,
  created_at DATETIME,
  updated_at DATETIME
);

CREATE TABLE IF NOT EXISTS ai_chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connection_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  created_at DATETIME,
  updated_at DATETIME,
  FOREIGN KEY(connection_id) REFERENCES connections(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ai_chats_connection_id ON ai_chats(connection_id);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT,
  language TEXT,
  created_at DATETIME,
  FOREIGN KEY(chat_id) REFERENCES ai_chats(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_chat_id ON ai_chat_messages(chat_id);

-- +goose Down
DROP TABLE IF EXISTS ai_chat_messages;
DROP TABLE IF EXISTS ai_chats;
DROP TABLE IF EXISTS ai_providers;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS saved_queries;
DROP TABLE IF EXISTS histories;
DROP TABLE IF EXISTS connections;
DROP TABLE IF EXISTS cache_items;

