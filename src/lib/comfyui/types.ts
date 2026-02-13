export interface ComfyUIPromptRequest {
  prompt: Record<string, unknown>;
  client_id?: string;
}

export interface ComfyUIPromptResponse {
  prompt_id: string;
  number: number;
  node_errors: Record<string, unknown>;
}

export interface ComfyUIHistoryEntry {
  prompt: [number, string, Record<string, unknown>, unknown, unknown];
  outputs: Record<
    string,
    {
      images?: ComfyUIOutputFile[];
      gifs?: ComfyUIOutputFile[];
      videos?: ComfyUIOutputFile[];
    }
  >;
  status: {
    status_str: string;
    completed: boolean;
  };
}

export interface ComfyUIOutputFile {
  filename: string;
  subfolder: string;
  type: string;
}

export interface ComfyUIUploadResponse {
  name: string;
  subfolder: string;
  type: string;
}

export interface ComfyUISystemStats {
  system: {
    os: string;
    python_version: string;
    embedded_python: boolean;
  };
  devices: {
    name: string;
    type: string;
    vram_total: number;
    vram_free: number;
  }[];
}
