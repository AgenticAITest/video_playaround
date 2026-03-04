import { NextRequest, NextResponse } from "next/server";
import { OpenRouterClient } from "@/lib/openrouter/client";
import { getSystemPrompt } from "@/lib/lmstudio/prompts";
import type { GenerationMode } from "@/types/generation";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { prompt, mode, openRouterApiKey, model } = body as {
            prompt: string;
            mode: GenerationMode;
            openRouterApiKey?: string;
            model?: string;
        };

        if (!prompt || !mode) {
            return NextResponse.json(
                { error: "prompt and mode are required" },
                { status: 400 }
            );
        }

        if (!openRouterApiKey) {
            return NextResponse.json(
                { error: "OpenRouter API key is required" },
                { status: 401 }
            );
        }

        const client = new OpenRouterClient(openRouterApiKey);

        const systemPrompt = getSystemPrompt(mode);

        const response = await client.chatCompletion({
            model: model || "google/gemini-2.5-flash",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 500,
        });

        const enhancedPrompt =
            response.choices?.[0]?.message?.content?.trim() || null;

        return NextResponse.json({ enhancedPrompt });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { enhancedPrompt: null, error: message },
            { status: 503 }
        );
    }
}
