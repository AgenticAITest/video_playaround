import { NextRequest, NextResponse } from "next/server";
import { ComfyUIClient } from "@/lib/comfyui/client";
import { getWorkflow } from "@/lib/db/workflows";
import { createGeneration, updateGeneration } from "@/lib/db/generations";
import type { GenerationMode, GenerationParams } from "@/types/generation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      workflowId,
      mode,
      prompt,
      negativePrompt,
      enhancedPrompt,
      params,
      inputImageFilename,
      clientId,
      comfyuiUrl,
    } = body as {
      workflowId: string;
      mode: GenerationMode;
      prompt: string;
      negativePrompt?: string;
      enhancedPrompt?: string;
      params: GenerationParams;
      inputImageFilename?: string;
      clientId?: string;
      comfyuiUrl?: string;
    };

    if (!workflowId || !prompt || !mode) {
      return NextResponse.json(
        { error: "workflowId, mode, and prompt are required" },
        { status: 400 }
      );
    }

    // Load workflow from DB
    const workflow = getWorkflow(workflowId);
    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Deep clone the workflow API JSON
    const filledWorkflow = JSON.parse(JSON.stringify(workflow.apiJson));

    // Substitute values via input mappings
    const activePrompt = enhancedPrompt || prompt;
    for (const mapping of workflow.inputMappings) {
      const node = filledWorkflow[mapping.nodeId];
      if (!node?.inputs) continue;

      switch (mapping.uiType) {
        case "prompt":
          node.inputs[mapping.fieldName] = activePrompt;
          break;
        case "negative_prompt":
          node.inputs[mapping.fieldName] = negativePrompt || "";
          break;
        case "width":
          node.inputs[mapping.fieldName] = params.width;
          break;
        case "height":
          node.inputs[mapping.fieldName] = params.height;
          break;
        case "steps":
          node.inputs[mapping.fieldName] = params.steps;
          break;
        case "cfg":
          node.inputs[mapping.fieldName] = params.cfgScale;
          break;
        case "seed":
          node.inputs[mapping.fieldName] =
            params.seed === -1
              ? Math.floor(Math.random() * 2 ** 32)
              : params.seed;
          break;
        case "checkpoint":
          // Only override if a value was explicitly provided
          if (
            mapping.fieldName in params &&
            params[mapping.fieldName] !== undefined
          ) {
            node.inputs[mapping.fieldName] = params[mapping.fieldName];
          }
          break;
        case "image_upload":
          if (inputImageFilename) {
            node.inputs[mapping.fieldName] = inputImageFilename;
          }
          break;
        default:
          // For custom mappings, check if param has a matching key
          if (
            mapping.fieldName in params &&
            params[mapping.fieldName] !== undefined
          ) {
            node.inputs[mapping.fieldName] = params[mapping.fieldName];
          }
          break;
      }
    }

    // Debug: log the filled workflow so we can compare with ComfyUI's version
    console.log("[prompt] Filled workflow being sent to ComfyUI:", JSON.stringify(filledWorkflow, null, 2));

    // Create generation record
    const generation = createGeneration({
      mode,
      workflowId,
      originalPrompt: prompt,
      enhancedPrompt: enhancedPrompt || null,
      negativePrompt: negativePrompt || "",
      params,
      inputImagePath: inputImageFilename || null,
    });

    // Queue on ComfyUI
    const client = new ComfyUIClient(comfyuiUrl || "http://localhost:8188");
    const result = await client.queuePrompt(filledWorkflow, clientId);

    // Update generation with ComfyUI prompt ID
    updateGeneration(generation.id, {
      status: "queued",
      comfyPromptId: result.prompt_id,
    });

    return NextResponse.json({
      promptId: result.prompt_id,
      generationId: generation.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
