import { NextRequest, NextResponse } from "next/server";
import { LMStudioClient } from "@/lib/lmstudio/client";

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
    const { description, lmStudioUrl, model } = body as {
      description: string;
      lmStudioUrl?: string;
      model?: string;
    };

    if (!description?.trim()) {
      return NextResponse.json(
        { error: "description is required" },
        { status: 400 }
      );
    }

    const client = new LMStudioClient(
      lmStudioUrl || "http://localhost:1234"
    );

    const response = await client.chatCompletion({
      model: model || "",
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
        error: "No response from LM Studio",
      });
    }

    try {
      const parsed = JSON.parse(content);
      return NextResponse.json(parsed);
    } catch {
      // If LM Studio returns non-JSON, wrap it
      return NextResponse.json({
        recommendations: [],
        searchSuggestions: [],
        generalAdvice: content,
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { recommendations: null, error: message },
      { status: 503 }
    );
  }
}
