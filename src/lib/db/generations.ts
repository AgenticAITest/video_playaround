import { v4 as uuidv4 } from "uuid";
import { getDb } from "./index";
import type {
  GenerationRecord,
  GenerationMode,
  GenerationParams,
  GenerationStatus,
  OutputFile,
} from "@/types/generation";

interface CreateGenerationInput {
  mode: GenerationMode;
  workflowId: string;
  originalPrompt: string;
  enhancedPrompt?: string | null;
  negativePrompt?: string;
  params: GenerationParams;
  inputImagePath?: string | null;
}

function rowToGeneration(row: Record<string, unknown>): GenerationRecord {
  return {
    id: row.id as string,
    mode: row.mode as GenerationMode,
    workflowId: row.workflow_id as string,
    originalPrompt: row.original_prompt as string,
    enhancedPrompt: (row.enhanced_prompt as string) || null,
    negativePrompt: (row.negative_prompt as string) || "",
    params: JSON.parse(row.params as string),
    inputImagePath: (row.input_image_path as string) || null,
    outputFiles: JSON.parse(row.output_files as string),
    status: row.status as GenerationStatus,
    comfyPromptId: (row.comfy_prompt_id as string) || null,
    error: (row.error as string) || null,
    createdAt: row.created_at as string,
    completedAt: (row.completed_at as string) || null,
  };
}

export function createGeneration(input: CreateGenerationInput): GenerationRecord {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO generations (id, mode, workflow_id, original_prompt, enhanced_prompt, negative_prompt, params, input_image_path, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.mode,
    input.workflowId,
    input.originalPrompt,
    input.enhancedPrompt ?? null,
    input.negativePrompt ?? "",
    JSON.stringify(input.params),
    input.inputImagePath ?? null,
    now
  );

  return getGeneration(id)!;
}

export function getGeneration(id: string): GenerationRecord | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM generations WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToGeneration(row) : null;
}

export function listGenerations(options?: {
  mode?: GenerationMode;
  limit?: number;
  offset?: number;
}): GenerationRecord[] {
  const db = getDb();
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  if (options?.mode) {
    const rows = db
      .prepare(
        "SELECT * FROM generations WHERE mode = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
      )
      .all(options.mode, limit, offset) as Record<string, unknown>[];
    return rows.map(rowToGeneration);
  }

  const rows = db
    .prepare("SELECT * FROM generations ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .all(limit, offset) as Record<string, unknown>[];
  return rows.map(rowToGeneration);
}

export function updateGeneration(
  id: string,
  updates: {
    status?: GenerationStatus;
    comfyPromptId?: string;
    enhancedPrompt?: string;
    outputFiles?: OutputFile[];
    error?: string;
    completedAt?: string;
  }
): GenerationRecord | null {
  const db = getDb();
  const existing = getGeneration(id);
  if (!existing) return null;

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.status !== undefined) {
    fields.push("status = ?");
    values.push(updates.status);
  }
  if (updates.comfyPromptId !== undefined) {
    fields.push("comfy_prompt_id = ?");
    values.push(updates.comfyPromptId);
  }
  if (updates.enhancedPrompt !== undefined) {
    fields.push("enhanced_prompt = ?");
    values.push(updates.enhancedPrompt);
  }
  if (updates.outputFiles !== undefined) {
    fields.push("output_files = ?");
    values.push(JSON.stringify(updates.outputFiles));
  }
  if (updates.error !== undefined) {
    fields.push("error = ?");
    values.push(updates.error);
  }
  if (updates.completedAt !== undefined) {
    fields.push("completed_at = ?");
    values.push(updates.completedAt);
  }

  if (fields.length === 0) return existing;

  values.push(id);
  db.prepare(`UPDATE generations SET ${fields.join(", ")} WHERE id = ?`).run(
    ...values
  );

  return getGeneration(id);
}

export function deleteGeneration(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM generations WHERE id = ?").run(id);
  return result.changes > 0;
}

export function countGenerations(mode?: GenerationMode): number {
  const db = getDb();
  if (mode) {
    const row = db
      .prepare("SELECT COUNT(*) as count FROM generations WHERE mode = ?")
      .get(mode) as { count: number };
    return row.count;
  }
  const row = db.prepare("SELECT COUNT(*) as count FROM generations").get() as {
    count: number;
  };
  return row.count;
}
