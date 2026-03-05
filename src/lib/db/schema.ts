import type Database from "better-sqlite3";

export function initializeSchema(db: Database.Database): void {
  const workflowsSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='workflows'").get() as { sql: string } | undefined;
  const generationsSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='generations'").get() as { sql: string } | undefined;

  // Migration for workflows table to include music categories
  if (workflowsSchema && !workflowsSchema.sql.includes("'text-to-music'")) {
    console.log("Migrating workflows table to include music categories...");
    db.transaction(() => {
      db.exec("ALTER TABLE workflows RENAME TO workflows_old");
      db.exec(`
        CREATE TABLE workflows (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT DEFAULT '',
          category TEXT NOT NULL CHECK(category IN ('text-to-image','text-to-video','image-to-video','image-to-image','text-to-music','music-to-music')),
          api_json TEXT NOT NULL,
          input_mappings TEXT NOT NULL,
          output_node_id TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
      db.exec("INSERT INTO workflows SELECT * FROM workflows_old");
      db.exec("DROP TABLE workflows_old");
    })();
  }

  // Migration for generations table to include input_audio_path
  if (generationsSchema && !generationsSchema.sql.includes("input_audio_path")) {
    console.log("Migrating generations table to include input_audio_path...");
    db.transaction(() => {
      db.exec("ALTER TABLE generations RENAME TO generations_old");
      db.exec(`
        CREATE TABLE generations (
          id TEXT PRIMARY KEY,
          mode TEXT NOT NULL CHECK(mode IN ('text-to-image','text-to-video','image-to-video','text-to-music','image-to-image','music-to-music')),
          workflow_id TEXT NOT NULL,
          original_prompt TEXT NOT NULL,
          enhanced_prompt TEXT,
          negative_prompt TEXT DEFAULT '',
          params TEXT NOT NULL,
          input_image_path TEXT,
          input_audio_path TEXT,
          output_files TEXT DEFAULT '[]',
          status TEXT NOT NULL DEFAULT 'idle',
          comfy_prompt_id TEXT,
          error TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          completed_at TEXT
        )
      `);
      db.exec("INSERT INTO generations (id, mode, workflow_id, original_prompt, enhanced_prompt, negative_prompt, params, input_image_path, output_files, status, comfy_prompt_id, error, created_at, completed_at) SELECT id, mode, workflow_id, original_prompt, enhanced_prompt, negative_prompt, params, input_image_path, output_files, status, comfy_prompt_id, error, created_at, completed_at FROM generations_old");
      db.exec("DROP TABLE generations_old");
    })();
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT NOT NULL CHECK(category IN ('text-to-image','text-to-video','image-to-video','image-to-image','text-to-music','music-to-music')),
      api_json TEXT NOT NULL,
      input_mappings TEXT NOT NULL,
      output_node_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS generations (
      id TEXT PRIMARY KEY,
      mode TEXT NOT NULL CHECK(mode IN ('text-to-image','text-to-video','image-to-video','text-to-music','image-to-image','music-to-music')),
      workflow_id TEXT NOT NULL,
      original_prompt TEXT NOT NULL,
      enhanced_prompt TEXT,
      negative_prompt TEXT DEFAULT '',
      params TEXT NOT NULL,
      input_image_path TEXT,
      input_audio_path TEXT,
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
