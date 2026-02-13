export type GenerationMode = "text-to-image" | "text-to-video" | "image-to-video";

export type GenerationStatus =
  | "idle"
  | "enhancing"
  | "queued"
  | "processing"
  | "completed"
  | "error";

export interface GenerationParams {
  width: number;
  height: number;
  steps: number;
  cfgScale: number;
  seed: number; // -1 = random
  [key: string]: unknown;
}

export interface OutputFile {
  filename: string;
  subfolder: string;
  type: "output" | "temp";
  mediaType: "image" | "video";
}

export interface GenerationRecord {
  id: string;
  mode: GenerationMode;
  workflowId: string;
  originalPrompt: string;
  enhancedPrompt: string | null;
  negativePrompt: string;
  params: GenerationParams;
  inputImagePath: string | null;
  outputFiles: OutputFile[];
  status: GenerationStatus;
  comfyPromptId: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}
