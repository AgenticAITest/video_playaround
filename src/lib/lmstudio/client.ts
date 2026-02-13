import type { ChatCompletionRequest, ChatCompletionResponse } from "./types";

export class LMStudioClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  async chatCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `LM Studio error ${response.status}: ${text || response.statusText}`
      );
    }

    return response.json();
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/v1/models`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`LM Studio error ${response.status}`);
    }

    const data = await response.json();
    return data.data?.map((m: { id: string }) => m.id) ?? [];
  }
}
