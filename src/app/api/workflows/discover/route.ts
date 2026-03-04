import { NextRequest, NextResponse } from "next/server";
import { OpenRouterClient } from "@/lib/openrouter/client";

const WORKFLOW_RECOMMEND_SYSTEM_PROMPT = `You are a ComfyUI expert helping a user find the right workflow for their needs. The user will describe what they want to create.

Respond in this EXACT JSON format (no markdown, no code fences, just raw JSON):
{
  "recommendations": [
    {
      "title": "Short descriptive title for this approach",
      "description": "2-3 sentences explaining this workflow approach and why it fits the user's needs.",
      "workflowType": "text-to-image" | "text-to-video" | "image-to-video",
      "requiredModels": ["Model name 1", "Model name 2"],
      "requiredNodes": ["custom_node_pack_1"],
      "searchTerms": ["search term for CivitAI or GitHub"],
      "difficulty": "beginner" | "intermediate" | "advanced",
      "qualityVsSpeed": "Brief note on quality and speed tradeoffs"
    }
  ],
  "searchSuggestions": [
    {
      "platform": "CivitAI" | "GitHub" | "OpenArt" | "ComfyWorkflows",
      "searchUrl": "Full search URL the user can click",
      "searchQuery": "The search query used"
    }
  ],
  "generalAdvice": "1-2 sentences of general advice for this type of generation."
}

Guidelines:
- Recommend 2-4 workflow approaches from most practical to most advanced
- Include specific model names (e.g., "sd_xl_base_1.0.safetensors", "wan2.1_i2v_480p_bf16.safetensors")
- Include specific custom node packs if needed (e.g., "ComfyUI-VideoHelperSuite")
- Generate real, working search URLs for CivitAI and GitHub
- CivitAI search URL format: https://civitai.com/search/models?sortBy=models_v9&query=QUERY
- GitHub search URL format: https://github.com/search?q=QUERY&type=repositories
- Be practical — recommend approaches that actually work well today
- Consider the user's likely experience level based on how they describe things`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, openRouterApiKey, model } = body as {
      description: string;
      openRouterApiKey?: string;
      model?: string;
    };

    if (!description?.trim()) {
      return NextResponse.json(
        { error: "description is required" },
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

    const response = await client.chatCompletion({
      model: model || "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: WORKFLOW_RECOMMEND_SYSTEM_PROMPT },
        {
          role: "user",
          content: `I want to: ${description}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 1500,
    });

    const content = response.choices?.[0]?.message?.content?.trim() || null;

    if (!content) {
      return NextResponse.json({
        recommendations: null,
        error: "No response from OpenRouter",
      });
    }

    try {
      // Strip markdown code blocks if the LLM included them
      const cleanContent = content.replace(/^`+json\s*/, '').replace(/`+$/, '').trim();
      const parsed = JSON.parse(cleanContent);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({
        recommendations: [],
        searchSuggestions: [],
        generalAdvice: content,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { recommendations: null, error: message },
      { status: 503 }
    );
  }
}
