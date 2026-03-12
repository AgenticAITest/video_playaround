import type { ChatCompletionRequest, ChatCompletionResponse } from "../lmstudio/types"; // Re-using same openai compat types for now

export class OpenRouterClient {
    private baseUrl: string = "https://openrouter.ai/api";
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async chatCompletion(
        request: ChatCompletionRequest
    ): Promise<ChatCompletionResponse> {
        const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.apiKey}`,
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Local Media Generation App",
            },
            body: JSON.stringify(request),
            signal: AbortSignal.timeout(60000),
        });

        if (!response.ok) {
            const text = await response.text().catch(() => "");
            throw new Error(
                `OpenRouter error ${response.status}: ${text || response.statusText}`
            );
        }

        return response.json();
    }
}
