import { NextRequest, NextResponse } from "next/server";
import { LMStudioClient } from "@/lib/lmstudio/client";

const WORKFLOW_EXPLAIN_SYSTEM_PROMPT = `You are a ComfyUI expert helping a beginner understand a workflow. You will receive a structured description of a ComfyUI workflow's nodes.

Respond in this EXACT JSON format (no markdown, no code fences, just raw JSON):
{
  "summary": "One clear sentence describing what this workflow does overall.",
  "nodeGroups": [
    {
      "groupName": "Short group name (e.g., 'Model Loading', 'Text Processing')",
      "explanation": "1-2 sentences explaining what this group of nodes does in plain English."
    }
  ],
  "keyParameters": [
    {
      "name": "Parameter name (e.g., 'Steps', 'CFG Scale')",
      "tip": "Brief tip on how adjusting this affects results."
    }
  ],
  "tips": ["Any helpful tips or warnings for the user, 1-3 items."]
}

Guidelines:
- Use simple language a non-technical person can understand
- Group related nodes together (don't list every node individually)
- Focus on what the user needs to know, skip internal plumbing details
- For key parameters, only mention ones the user should actually adjust
- Keep everything concise`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflowSummary, lmStudioUrl, model } = body as {
      workflowSummary: string;
      lmStudioUrl?: string;
      model?: string;
    };

    if (!workflowSummary) {
      return NextResponse.json(
        { error: "workflowSummary is required" },
        { status: 400 }
      );
    }

    const client = new LMStudioClient(
      lmStudioUrl || "http://localhost:1234"
    );

    const response = await client.chatCompletion({
      model: model || "",
      messages: [
        { role: "system", content: WORKFLOW_EXPLAIN_SYSTEM_PROMPT },
        { role: "user", content: workflowSummary },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices?.[0]?.message?.content?.trim() || null;

    if (!content) {
      return NextResponse.json({ explanation: null, error: "No response from LM Studio" });
    }

    // Try to parse as JSON
    try {
      const explanation = JSON.parse(content);
      return NextResponse.json({ explanation });
    } catch {
      // If LM Studio returns non-JSON, wrap it
      return NextResponse.json({
        explanation: {
          summary: content,
          nodeGroups: [],
          keyParameters: [],
          tips: [],
        },
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { explanation: null, error: message },
      { status: 503 }
    );
  }
}
