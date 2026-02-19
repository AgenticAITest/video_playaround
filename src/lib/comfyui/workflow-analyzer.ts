import { listWorkflowNodes, autoDetectMappings, detectOutputNode } from "./workflow-utils";
import { getNodeDescription, getNodeFriendlyName } from "./node-descriptions";
import type { InputMapping, WorkflowCategory } from "@/types/workflow";

/**
 * Represents a node found in the workflow with enriched info.
 */
export interface AnalyzedNode {
  nodeId: string;
  classType: string;
  friendlyName: string;
  description: string;
  category: string;
  inputs: string[];
  title: string;
}

/**
 * Model reference extracted from a workflow node.
 */
export interface ModelReference {
  nodeId: string;
  nodeType: string;
  fieldName: string;
  modelName: string;
  modelType: "checkpoint" | "lora" | "vae" | "controlnet" | "upscale_model" | "clip" | "unet" | "other";
}

/**
 * Result of checking a workflow node against installed ComfyUI nodes.
 */
export interface CompatibilityResult {
  installedNodes: string[];
  missingNodes: string[];
  totalWorkflowNodes: number;
  allInstalled: boolean;
}

/**
 * Result of checking model references against available models.
 */
export interface ModelCheckResult {
  references: ModelReference[];
  availableModels: Record<string, string[]>;
  missingModels: ModelReference[];
  allAvailable: boolean;
}

/**
 * Complete analysis result for a workflow.
 */
export interface WorkflowAnalysis {
  nodes: AnalyzedNode[];
  compatibility: CompatibilityResult;
  models: ModelCheckResult;
  suggestedCategory: WorkflowCategory;
  suggestedMappings: InputMapping[];
  outputNodeId: string | null;
  summaryForLLM: string;
}

/**
 * Fields on an object_info node entry that hold model filename lists.
 * Maps field_name -> model_type.
 */
const MODEL_FIELDS: Record<string, ModelReference["modelType"]> = {
  ckpt_name: "checkpoint",
  lora_name: "lora",
  vae_name: "vae",
  control_net_name: "controlnet",
  model_name: "upscale_model",
  clip_name: "clip",
  unet_name: "unet",
};

/**
 * Analyze all nodes in a workflow with friendly descriptions.
 */
export function analyzeNodes(apiJson: Record<string, unknown>): AnalyzedNode[] {
  const rawNodes = listWorkflowNodes(apiJson);
  return rawNodes.map((node) => {
    const desc = getNodeDescription(node.classType);
    return {
      nodeId: node.nodeId,
      classType: node.classType,
      friendlyName: desc.friendlyName,
      description: desc.description,
      category: desc.category,
      inputs: node.inputs,
      title: node.title,
    };
  });
}

/**
 * Check workflow nodes against installed ComfyUI node types.
 */
export function checkNodeCompatibility(
  apiJson: Record<string, unknown>,
  objectInfo: Record<string, unknown>
): CompatibilityResult {
  const installedTypes = new Set(Object.keys(objectInfo));
  const workflowTypes = new Set<string>();

  for (const rawNode of Object.values(apiJson)) {
    const node = rawNode as { class_type?: string };
    if (node?.class_type) {
      workflowTypes.add(node.class_type);
    }
  }

  const installedNodes: string[] = [];
  const missingNodes: string[] = [];

  for (const nodeType of workflowTypes) {
    if (installedTypes.has(nodeType)) {
      installedNodes.push(nodeType);
    } else {
      missingNodes.push(nodeType);
    }
  }

  return {
    installedNodes,
    missingNodes,
    totalWorkflowNodes: workflowTypes.size,
    allInstalled: missingNodes.length === 0,
  };
}

/**
 * Extract model file references from workflow node inputs.
 */
export function extractModelReferences(apiJson: Record<string, unknown>): ModelReference[] {
  const references: ModelReference[] = [];

  for (const [nodeId, rawNode] of Object.entries(apiJson)) {
    const node = rawNode as { class_type?: string; inputs?: Record<string, unknown> };
    if (!node?.class_type || !node.inputs) continue;

    for (const [fieldName, value] of Object.entries(node.inputs)) {
      if (typeof value !== "string" || Array.isArray(value)) continue;

      // Check known model fields
      const modelType = MODEL_FIELDS[fieldName];
      if (modelType && value.trim()) {
        references.push({
          nodeId,
          nodeType: node.class_type,
          fieldName,
          modelName: value,
          modelType,
        });
      }
    }
  }

  return references;
}

/**
 * Check model references against available models from object_info.
 */
export function checkModelAvailability(
  references: ModelReference[],
  objectInfo: Record<string, unknown>
): ModelCheckResult {
  // Extract available model lists from object_info node definitions
  const availableModels: Record<string, string[]> = {};

  for (const [nodeType, nodeInfo] of Object.entries(objectInfo)) {
    const info = nodeInfo as {
      input?: { required?: Record<string, unknown>; optional?: Record<string, unknown> };
    };
    if (!info?.input) continue;

    const allInputs = { ...info.input.required, ...info.input.optional };
    for (const [fieldName, fieldDef] of Object.entries(allInputs)) {
      if (fieldName in MODEL_FIELDS && Array.isArray(fieldDef)) {
        const options = fieldDef[0];
        if (Array.isArray(options)) {
          const key = `${nodeType}.${fieldName}`;
          availableModels[key] = options as string[];
        }
      }
    }
  }

  // Check each reference
  const missingModels: ModelReference[] = [];
  for (const ref of references) {
    // Find matching available list
    const key = `${ref.nodeType}.${ref.fieldName}`;
    const available = availableModels[key];
    if (available && !available.includes(ref.modelName)) {
      missingModels.push(ref);
    }
  }

  return {
    references,
    availableModels,
    missingModels,
    allAvailable: missingModels.length === 0,
  };
}

/**
 * Guess the workflow category based on node types present.
 */
export function suggestCategory(apiJson: Record<string, unknown>): WorkflowCategory {
  const types = new Set<string>();
  for (const rawNode of Object.values(apiJson)) {
    const node = rawNode as { class_type?: string };
    if (node?.class_type) types.add(node.class_type.toLowerCase());
  }

  // Video indicators
  const videoNodes = [
    "vhs_videocombine", "saveanimatedwebp", "saveanimatedpng", "savevideo",
    "svd_img2vid_conditioning", "imageonly checkpointloader",
    "emptyhunyuanlatentVideo", "wan_fun_inp_sampler",
  ];
  const hasVideo = videoNodes.some((n) => types.has(n));

  // Image input indicators
  const hasImageInput = types.has("loadimage");

  if (hasVideo && hasImageInput) return "image-to-video";
  if (hasVideo) return "text-to-video";
  return "text-to-image";
}

/**
 * Build a structured text summary of the workflow for LM Studio to explain.
 */
export function buildWorkflowSummary(nodes: AnalyzedNode[]): string {
  // Group nodes by category
  const groups: Record<string, AnalyzedNode[]> = {};
  for (const node of nodes) {
    if (!groups[node.category]) groups[node.category] = [];
    groups[node.category].push(node);
  }

  const lines: string[] = [];
  lines.push(`This ComfyUI workflow has ${nodes.length} nodes:`);
  lines.push("");

  const categoryOrder = ["loader", "conditioning", "sampler", "latent", "image", "video", "upscale", "controlnet", "mask", "output", "utility", "other"];

  for (const cat of categoryOrder) {
    const group = groups[cat];
    if (!group) continue;

    lines.push(`[${cat.toUpperCase()}]`);
    for (const node of group) {
      const inputStr = node.inputs.length > 0 ? ` (inputs: ${node.inputs.join(", ")})` : "";
      lines.push(`- Node ${node.nodeId}: ${node.classType} "${node.friendlyName}"${inputStr}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Perform a complete workflow analysis.
 * objectInfo is optional — if not provided, compatibility/model checks are skipped.
 */
export function analyzeWorkflow(
  apiJson: Record<string, unknown>,
  objectInfo?: Record<string, unknown>
): WorkflowAnalysis {
  const nodes = analyzeNodes(apiJson);
  const suggestedMappings = autoDetectMappings(apiJson);
  const outputNodeId = detectOutputNode(apiJson);
  const suggestedCat = suggestCategory(apiJson);
  const summaryForLLM = buildWorkflowSummary(nodes);

  // Model references from workflow
  const modelRefs = extractModelReferences(apiJson);

  // Compatibility checks (need objectInfo from ComfyUI)
  let compatibility: CompatibilityResult;
  let models: ModelCheckResult;

  if (objectInfo) {
    compatibility = checkNodeCompatibility(apiJson, objectInfo);
    models = checkModelAvailability(modelRefs, objectInfo);
  } else {
    // Without objectInfo, we can't check — report as unknown
    const workflowTypes = new Set<string>();
    for (const rawNode of Object.values(apiJson)) {
      const node = rawNode as { class_type?: string };
      if (node?.class_type) workflowTypes.add(node.class_type);
    }
    compatibility = {
      installedNodes: [],
      missingNodes: [...workflowTypes],
      totalWorkflowNodes: workflowTypes.size,
      allInstalled: false,
    };
    models = {
      references: modelRefs,
      availableModels: {},
      missingModels: modelRefs,
      allAvailable: false,
    };
  }

  return {
    nodes,
    compatibility,
    models,
    suggestedCategory: suggestedCat,
    suggestedMappings,
    outputNodeId,
    summaryForLLM,
  };
}
