import type { InputMapping, InputUIType } from "@/types/workflow";

interface WorkflowNode {
  class_type: string;
  inputs: Record<string, unknown>;
  _meta?: { title?: string };
}

type WorkflowJson = Record<string, WorkflowNode>;

/**
 * Validates that JSON is in ComfyUI API format (node IDs as keys with class_type).
 * Returns null if valid, or an error message if invalid.
 */
export function validateApiFormat(json: unknown): string | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return "JSON must be an object with node IDs as keys";
  }

  const obj = json as Record<string, unknown>;

  // Check for visual workflow format (has nodes/links arrays)
  if ("nodes" in obj && "links" in obj) {
    return 'This appears to be a visual workflow format (has "nodes" and "links"). Please export the API format instead: in ComfyUI, use "Save (API Format)" or enable Dev Mode in settings and use "Save (API Format)".';
  }

  const keys = Object.keys(obj);
  if (keys.length === 0) {
    return "Workflow has no nodes";
  }

  // Verify at least some entries have class_type
  let nodesWithClassType = 0;
  for (const key of keys) {
    const node = obj[key];
    if (
      node &&
      typeof node === "object" &&
      "class_type" in (node as Record<string, unknown>)
    ) {
      nodesWithClassType++;
    }
  }

  if (nodesWithClassType === 0) {
    return "No nodes with class_type found. This does not appear to be a valid ComfyUI API-format workflow.";
  }

  return null;
}

/**
 * Lists all nodes in a workflow with their class types and inputs.
 */
export function listWorkflowNodes(
  apiJson: Record<string, unknown>
): { nodeId: string; classType: string; title: string; inputs: string[] }[] {
  const nodes: {
    nodeId: string;
    classType: string;
    title: string;
    inputs: string[];
  }[] = [];

  for (const [nodeId, rawNode] of Object.entries(apiJson)) {
    const node = rawNode as WorkflowNode;
    if (!node?.class_type) continue;

    const inputKeys = node.inputs
      ? Object.keys(node.inputs).filter((k) => {
          // Skip inputs that are links to other nodes (arrays like [nodeId, outputIndex])
          const val = node.inputs[k];
          return !Array.isArray(val);
        })
      : [];

    nodes.push({
      nodeId,
      classType: node.class_type,
      title: node._meta?.title || node.class_type,
      inputs: inputKeys,
    });
  }

  return nodes;
}

/**
 * Checks if a CLIPTextEncode node is likely the negative prompt.
 * Heuristic: look at the text content or trace connections.
 */
function isLikelyNegative(node: WorkflowNode): boolean {
  const text = (node.inputs?.text as string) || "";
  const lower = text.toLowerCase();
  // Common negative prompt indicators
  return (
    lower.includes("bad") ||
    lower.includes("ugly") ||
    lower.includes("deformed") ||
    lower.includes("worst quality") ||
    lower.includes("low quality") ||
    lower.includes("blurry") ||
    lower.includes("negative")
  );
}

/**
 * Auto-detects input mappings from a ComfyUI API-format workflow.
 */
export function autoDetectMappings(
  apiJson: Record<string, unknown>
): InputMapping[] {
  const mappings: InputMapping[] = [];
  const workflow = apiJson as WorkflowJson;
  let promptFound = false;

  for (const [nodeId, node] of Object.entries(workflow)) {
    if (!node?.class_type) continue;
    const classType = node.class_type;

    // CLIPTextEncode -> prompt or negative_prompt
    if (classType === "CLIPTextEncode") {
      if ("text" in node.inputs) {
        const isNeg = isLikelyNegative(node);
        if (isNeg) {
          mappings.push({
            nodeId,
            fieldName: "text",
            uiType: "negative_prompt",
            label: "Negative Prompt",
            defaultValue: node.inputs.text || "",
          });
        } else {
          mappings.push({
            nodeId,
            fieldName: "text",
            uiType: promptFound ? "negative_prompt" : "prompt",
            label: promptFound ? "Negative Prompt" : "Prompt",
            defaultValue: node.inputs.text || "",
          });
          if (!promptFound) promptFound = true;
        }
      }
    }

    // KSampler / KSamplerAdvanced -> steps, cfg, seed, sampler, scheduler
    if (classType === "KSampler" || classType === "KSamplerAdvanced") {
      if ("steps" in node.inputs) {
        mappings.push({
          nodeId,
          fieldName: "steps",
          uiType: "steps",
          label: "Steps",
          defaultValue: node.inputs.steps,
        });
      }
      if ("cfg" in node.inputs) {
        mappings.push({
          nodeId,
          fieldName: "cfg",
          uiType: "cfg",
          label: "CFG Scale",
          defaultValue: node.inputs.cfg,
        });
      }
      const seedField =
        "seed" in node.inputs
          ? "seed"
          : "noise_seed" in node.inputs
            ? "noise_seed"
            : null;
      if (seedField) {
        mappings.push({
          nodeId,
          fieldName: seedField,
          uiType: "seed",
          label: "Seed",
          defaultValue: node.inputs[seedField],
        });
      }
      if ("sampler_name" in node.inputs) {
        mappings.push({
          nodeId,
          fieldName: "sampler_name",
          uiType: "sampler",
          label: "Sampler",
          defaultValue: node.inputs.sampler_name,
        });
      }
      if ("scheduler" in node.inputs) {
        mappings.push({
          nodeId,
          fieldName: "scheduler",
          uiType: "scheduler",
          label: "Scheduler",
          defaultValue: node.inputs.scheduler,
        });
      }
    }

    // SamplerCustom / SamplerCustomAdvanced
    if (
      classType === "SamplerCustom" ||
      classType === "SamplerCustomAdvanced"
    ) {
      if ("cfg" in node.inputs) {
        mappings.push({
          nodeId,
          fieldName: "cfg",
          uiType: "cfg",
          label: "CFG Scale",
          defaultValue: node.inputs.cfg,
        });
      }
    }

    // EmptyLatentImage / EmptySD3LatentImage / EmptyHunyuanLatentVideo -> width, height
    if (
      classType === "EmptyLatentImage" ||
      classType === "EmptySD3LatentImage" ||
      classType === "EmptyHunyuanLatentVideo"
    ) {
      if ("width" in node.inputs) {
        mappings.push({
          nodeId,
          fieldName: "width",
          uiType: "width",
          label: "Width",
          defaultValue: node.inputs.width,
        });
      }
      if ("height" in node.inputs) {
        mappings.push({
          nodeId,
          fieldName: "height",
          uiType: "height",
          label: "Height",
          defaultValue: node.inputs.height,
        });
      }
    }

    // CheckpointLoaderSimple / CheckpointLoader -> checkpoint
    if (
      classType === "CheckpointLoaderSimple" ||
      classType === "CheckpointLoader"
    ) {
      if ("ckpt_name" in node.inputs) {
        mappings.push({
          nodeId,
          fieldName: "ckpt_name",
          uiType: "checkpoint",
          label: "Checkpoint",
          defaultValue: node.inputs.ckpt_name,
        });
      }
    }

    // LoadImage -> image_upload
    if (classType === "LoadImage") {
      if ("image" in node.inputs) {
        mappings.push({
          nodeId,
          fieldName: "image",
          uiType: "image_upload",
          label: "Input Image",
          defaultValue: "",
        });
      }
    }
  }

  return mappings;
}

/**
 * Detects the output node in the workflow (SaveImage, video combine, etc.).
 */
export function detectOutputNode(
  apiJson: Record<string, unknown>
): string | null {
  const outputTypes = [
    "saveimage",
    "previewimage",
    "saveanimatedwebp",
    "saveanimatedpng",
    "vhs_videocombine",
    "savevideo",
    "saveanimatedgif",
  ];

  for (const [nodeId, rawNode] of Object.entries(apiJson)) {
    const node = rawNode as WorkflowNode;
    if (node?.class_type && outputTypes.includes(node.class_type.toLowerCase())) {
      return nodeId;
    }
  }

  return null;
}

/**
 * Returns all unique uiType labels for display purposes.
 */
export function getUITypeLabel(uiType: InputUIType): string {
  const labels: Record<InputUIType, string> = {
    prompt: "Prompt",
    negative_prompt: "Negative Prompt",
    image_upload: "Image Upload",
    checkpoint: "Checkpoint",
    width: "Width",
    height: "Height",
    steps: "Steps",
    cfg: "CFG Scale",
    seed: "Seed",
    sampler: "Sampler",
    scheduler: "Scheduler",
    custom: "Custom",
  };
  return labels[uiType] || uiType;
}
