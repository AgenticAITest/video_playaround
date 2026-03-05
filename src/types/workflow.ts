export type WorkflowCategory = "text-to-image" | "text-to-video" | "image-to-video" | "image-to-image" | "text-to-music" | "music-to-music";

export type InputUIType =
  | "prompt"
  | "negative_prompt"
  | "image_upload"
  | "audio_upload"
  | "width"
  | "height"
  | "steps"
  | "cfg"
  | "seed"
  | "sampler"
  | "scheduler"
  | "checkpoint"
  | "music_tags"
  | "music_duration"
  | "music_bpm"
  | "music_key"
  | "music_time_sig"
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
