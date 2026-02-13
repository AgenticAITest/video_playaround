export type WorkflowCategory = "text-to-image" | "text-to-video" | "image-to-video";

export type InputUIType =
  | "prompt"
  | "negative_prompt"
  | "image_upload"
  | "width"
  | "height"
  | "steps"
  | "cfg"
  | "seed"
  | "sampler"
  | "scheduler"
  | "checkpoint"
  | "custom";

export interface InputMapping {
  nodeId: string;
  fieldName: string;
  uiType: InputUIType;
  label: string;
  defaultValue: unknown;
  description?: string;
}

export interface WorkflowConfig {
  id: string;
  name: string;
  description: string;
  category: WorkflowCategory;
  apiJson: Record<string, unknown>;
  inputMappings: InputMapping[];
  outputNodeId: string;
  createdAt: string;
  updatedAt: string;
}
