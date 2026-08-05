-- Migration: create r2_objects table to store uploaded object metadata
CREATE TABLE IF NOT EXISTS r2_objects (
  id TEXT PRIMARY KEY,
  object_key TEXT NOT NULL,
  bucket_name TEXT,
  filename TEXT,
  content_type TEXT,
  size INTEGER,
  purpose TEXT,
  uploader_id TEXT,
  created_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_r2_objects_purpose ON r2_objects(purpose);
