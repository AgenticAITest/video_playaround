import { NextRequest, NextResponse } from "next/server";
import { LMStudioClient } from "@/lib/lmstudio/client";
import { getSystemPrompt } from "@/lib/lmstudio/prompts";
import type { GenerationMode } from "@/types/generation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, mode, lmStudioUrl, model } = body as {
      prompt: string;
      mode: GenerationMode;
      lmStudioUrl?: string;
      model?: string;
    };

    if (!prompt || !mode) {
      return NextResponse.json(
        { error: "prompt and mode are required" },
        { status: 400 }
      );
    }

    const client = new LMStudioClient(
      lmStudioUrl || "http://localhost:1234"
    );

    const systemPrompt = getSystemPrompt(mode);

    const response = await client.chatCompletion({
      model: model || "",
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
