import type {
  ComfyUIPromptRequest,
  ComfyUIPromptResponse,
  ComfyUIHistoryEntry,
  ComfyUIUploadResponse,
  ComfyUISystemStats,
} from "./types";

export class ComfyUIClient {
  private baseUrl: string;
  /** Origin header matching the ComfyUI host — prevents 403 from origin check */
  private origin: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    // Derive origin from the base URL (scheme + host + port)
    try {
      const u = new URL(this.baseUrl);
      this.origin = u.origin;
    } catch {
      this.origin = this.baseUrl;
    }
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return { Origin: this.origin, ...extra };
  }

  async queuePrompt(
    workflow: Record<string, unknown>,
    clientId?: string
  ): Promise<ComfyUIPromptResponse> {
    const body: ComfyUIPromptRequest = { prompt: workflow };
    if (clientId) body.client_id = clientId;

    const response = await fetch(`${this.baseUrl}/prompt`, {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `ComfyUI prompt error ${response.status}: ${text || response.statusText}`
      );
    }

    return response.json();
  }

  async getHistory(
    promptId: string
  ): Promise<ComfyUIHistoryEntry | null> {
    const response = await fetch(
      `${this.baseUrl}/history/${promptId}`,
      { signal: AbortSignal.timeout(10000), headers: this.headers() }
    );

    if (!response.ok) {
      throw new Error(`ComfyUI history error ${response.status}`);
    }

    const data = await response.json();
    return data[promptId] ?? null;
  }

  async viewFile(
    filename: string,
    subfolder?: string,
    type?: string
  ): Promise<Response> {
    const params = new URLSearchParams({ filename });
    if (subfolder) params.set("subfolder", subfolder);
    if (type) params.set("type", type);

    const response = await fetch(
      `${this.baseUrl}/view?${params.toString()}`,
      { headers: this.headers() }
    );

    if (!response.ok) {
      throw new Error(`ComfyUI view error ${response.status}`);
    }

    return response;
  }

  async uploadImage(
    file: Buffer,
    filename: string,
    overwrite?: boolean
  ): Promise<ComfyUIUploadResponse> {
    const formData = new FormData();
    formData.append(
      "image",
      new Blob([file as unknown as BlobPart]),
      filename
    );
    if (overwrite) {
      formData.append("overwrite", "true");
    }

    const response = await fetch(`${this.baseUrl}/upload/image`, {
      method: "POST",
      headers: this.headers(),
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `ComfyUI upload error ${response.status}: ${text || response.statusText}`
      );
    }

    return response.json();
  }

  async getSystemStats(): Promise<ComfyUISystemStats> {
    const response = await fetch(`${this.baseUrl}/system_stats`, {
      signal: AbortSignal.timeout(5000),
      headers: this.headers(),
    });

    if (!response.ok) {
      throw new Error(`ComfyUI system_stats error ${response.status}`);
    }

    return response.json();
  }

  async getObjectInfo(): Promise<Record<string, unknown>> {
    const response = await fetch(`${this.baseUrl}/object_info`, {
      signal: AbortSignal.timeout(15000),
      headers: this.headers(),
    });

    if (!response.ok) {
      throw new Error(`ComfyUI object_info error ${response.status}`);
    }

    return response.json();
  }
}
