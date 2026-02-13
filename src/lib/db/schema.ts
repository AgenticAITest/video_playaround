import type Database from "better-sqlite3";

export function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT NOT NULL CHECK(category IN ('text-to-image','text-to-video','image-to-video')),
      api_json TEXT NOT NULL,
      input_mappings TEXT NOT NULL,
      output_node_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS generations (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL CHECK(mode IN ('text-to-image','text-to-video','image-to-video')),
      workflow_id TEXT NOT NULL,
      original_prompt TEXT NOT NULL,
      enhanced_prompt TEXT,
      negative_prompt TEXT DEFAULT '',
      params TEXT NOT NULL,
      input_image_path TEXT,
      output_files TEXT DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'idle',
      comfy_prompt_id TEXT,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_generations_mode ON generations(mode);
    CREATE INDEX IF NOT EXISTS idx_generations_created ON generations(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_generations_workflow ON generations(workflow_id);
  `);
}
