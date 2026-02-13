import { v4 as uuidv4 } from "uuid";
import { getDb } from "./index";
import type { WorkflowConfig, WorkflowCategory } from "@/types/workflow";

interface CreateWorkflowInput {
  name: string;
  description: string;
  category: WorkflowCategory;
  apiJson: Record<string, unknown>;
  inputMappings: WorkflowConfig["inputMappings"];
  outputNodeId: string;
}

function rowToWorkflow(row: Record<string, unknown>): WorkflowConfig {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    category: row.category as WorkflowCategory,
    apiJson: JSON.parse(row.api_json as string),
    inputMappings: JSON.parse(row.input_mappings as string),
    outputNodeId: row.output_node_id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function createWorkflow(input: CreateWorkflowInput): WorkflowConfig {
  const db = getDb();
  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO workflows (id, name, description, category, api_json, input_mappings, output_node_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.name,
    input.description,
    input.category,
    JSON.stringify(input.apiJson),
    JSON.stringify(input.inputMappings),
    input.outputNodeId,
    now,
    now
  );

  return getWorkflow(id)!;
}

export function getWorkflow(id: string): WorkflowConfig | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM workflows WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToWorkflow(row) : null;
}

export function listWorkflows(category?: WorkflowCategory): WorkflowConfig[] {
  const db = getDb();
  if (category) {
    const rows = db
      .prepare("SELECT * FROM workflows WHERE category = ? ORDER BY created_at DESC")
      .all(category) as Record<string, unknown>[];
    return rows.map(rowToWorkflow);
  }
  const rows = db
    .prepare("SELECT * FROM workflows ORDER BY created_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map(rowToWorkflow);
}

export function updateWorkflow(
  id: string,
  updates: Partial<Pick<CreateWorkflowInput, "name" | "description" | "category" | "inputMappings" | "outputNodeId">>
): WorkflowConfig | null {
  const db = getDb();
  const existing = getWorkflow(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE workflows SET
      name = ?, description = ?, category = ?,
      input_mappings = ?, output_node_id = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    updates.name ?? existing.name,
    updates.description ?? existing.description,
    updates.category ?? existing.category,
    updates.inputMappings
      ? JSON.stringify(updates.inputMappings)
      : JSON.stringify(existing.inputMappings),
    updates.outputNodeId ?? existing.outputNodeId,
    now,
    id
  );

  return getWorkflow(id);
}

export function deleteWorkflow(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM workflows WHERE id = ?").run(id);
  return result.changes > 0;
}
