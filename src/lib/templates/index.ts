import type { WorkflowCategory, InputMapping } from "@/types/workflow";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: WorkflowCategory;
  difficulty: "beginner" | "intermediate" | "advanced";
  exampleUseCase: string;
  requiredModels: { name: string; type: string; downloadHint: string }[];
  requiredCustomNodes: string[];
  apiJson: Record<string, unknown>;
  inputMappings: InputMapping[];
  outputNodeId: string;
}

// ============================================================
// Template: Text-to-Image (SDXL Basic)
// ============================================================
const SDXL_BASIC: WorkflowTemplate = {
  id: "tpl-sdxl-basic",
  name: "Text to Image (SDXL)",
  description:
    "Generate high-quality images from text prompts using SDXL. Great starting point for AI image generation with good quality and reasonable speed.",
  category: "text-to-image",
  difficulty: "beginner",
  exampleUseCase:
    "Create digital art, concept art, illustrations, or photorealistic images from text descriptions.",
  requiredModels: [
    {
      name: "sd_xl_base_1.0.safetensors",
      type: "checkpoint",
      downloadHint: "Download from Hugging Face: stabilityai/stable-diffusion-xl-base-1.0",
    },
  ],
  requiredCustomNodes: [],
  apiJson: {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: "sd_xl_base_1.0.safetensors" },
    },
    "2": {
      class_type: "CLIPTextEncode",
      inputs: { text: "a beautiful landscape", clip: ["1", 1] },
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: "bad quality, worst quality, low quality, blurry, deformed",
        clip: ["1", 1],
      },
    },
    "4": {
      class_type: "EmptyLatentImage",
      inputs: { width: 1024, height: 1024, batch_size: 1 },
    },
    "5": {
      class_type: "KSampler",
      inputs: {
        seed: -1,
        steps: 25,
        cfg: 7.0,
        sampler_name: "dpmpp_2m",
        scheduler: "karras",
        denoise: 1.0,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["4", 0],
      },
    },
    "6": {
      class_type: "VAEDecode",
      inputs: { samples: ["5", 0], vae: ["1", 2] },
    },
    "7": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "SDXL", images: ["6", 0] },
    },
  },
  inputMappings: [
    { nodeId: "2", fieldName: "text", uiType: "prompt", label: "Prompt", defaultValue: "a beautiful landscape" },
    { nodeId: "3", fieldName: "text", uiType: "negative_prompt", label: "Negative Prompt", defaultValue: "bad quality, worst quality, low quality, blurry, deformed" },
    { nodeId: "1", fieldName: "ckpt_name", uiType: "checkpoint", label: "Checkpoint", defaultValue: "sd_xl_base_1.0.safetensors" },
    { nodeId: "4", fieldName: "width", uiType: "width", label: "Width", defaultValue: 1024 },
    { nodeId: "4", fieldName: "height", uiType: "height", label: "Height", defaultValue: 1024 },
    { nodeId: "5", fieldName: "steps", uiType: "steps", label: "Steps", defaultValue: 25 },
    { nodeId: "5", fieldName: "cfg", uiType: "cfg", label: "CFG Scale", defaultValue: 7.0 },
    { nodeId: "5", fieldName: "seed", uiType: "seed", label: "Seed", defaultValue: -1 },
    { nodeId: "5", fieldName: "sampler_name", uiType: "sampler", label: "Sampler", defaultValue: "dpmpp_2m" },
    { nodeId: "5", fieldName: "scheduler", uiType: "scheduler", label: "Scheduler", defaultValue: "karras" },
  ],
  outputNodeId: "7",
};

// ============================================================
// Template: Text-to-Image (Flux.1 Basic)
// ============================================================
const FLUX_BASIC: WorkflowTemplate = {
  id: "tpl-flux-basic",
  name: "Text to Image (Flux.1)",
  description:
    "Generate images using Flux.1, a next-gen model with excellent prompt following and natural image quality. Uses a different architecture than SDXL.",
  category: "text-to-image",
  difficulty: "beginner",
  exampleUseCase:
    "High-quality photorealistic images, text rendering in images, complex scene composition.",
  requiredModels: [
    {
      name: "flux1-dev-fp8.safetensors",
      type: "checkpoint",
      downloadHint: "Download Flux.1 Dev from Hugging Face: black-forest-labs/FLUX.1-dev (use fp8 quantized for less VRAM)",
    },
  ],
  requiredCustomNodes: [],
  apiJson: {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: "flux1-dev-fp8.safetensors" },
    },
    "2": {
      class_type: "CLIPTextEncode",
      inputs: { text: "a photo of a cat wearing a tiny hat", clip: ["1", 1] },
    },
    "3": {
      class_type: "EmptyLatentImage",
      inputs: { width: 1024, height: 1024, batch_size: 1 },
    },
    "4": {
      class_type: "KSampler",
      inputs: {
        seed: -1,
        steps: 20,
        cfg: 1.0,
        sampler_name: "euler",
        scheduler: "simple",
        denoise: 1.0,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["5", 0],
        latent_image: ["3", 0],
      },
    },
    "5": {
      class_type: "CLIPTextEncode",
      inputs: { text: "", clip: ["1", 1] },
    },
    "6": {
      class_type: "VAEDecode",
      inputs: { samples: ["4", 0], vae: ["1", 2] },
    },
    "7": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "Flux", images: ["6", 0] },
    },
  },
  inputMappings: [
    { nodeId: "2", fieldName: "text", uiType: "prompt", label: "Prompt", defaultValue: "a photo of a cat wearing a tiny hat" },
    { nodeId: "5", fieldName: "text", uiType: "negative_prompt", label: "Negative Prompt", defaultValue: "" },
    { nodeId: "1", fieldName: "ckpt_name", uiType: "checkpoint", label: "Checkpoint", defaultValue: "flux1-dev-fp8.safetensors" },
    { nodeId: "3", fieldName: "width", uiType: "width", label: "Width", defaultValue: 1024 },
    { nodeId: "3", fieldName: "height", uiType: "height", label: "Height", defaultValue: 1024 },
    { nodeId: "4", fieldName: "steps", uiType: "steps", label: "Steps", defaultValue: 20 },
    { nodeId: "4", fieldName: "cfg", uiType: "cfg", label: "CFG Scale", defaultValue: 1.0 },
    { nodeId: "4", fieldName: "seed", uiType: "seed", label: "Seed", defaultValue: -1 },
    { nodeId: "4", fieldName: "sampler_name", uiType: "sampler", label: "Sampler", defaultValue: "euler" },
    { nodeId: "4", fieldName: "scheduler", uiType: "scheduler", label: "Scheduler", defaultValue: "simple" },
  ],
  outputNodeId: "7",
};

// ============================================================
// Template: Text-to-Video (Wan2.1)
// ============================================================
const WAN21_T2V: WorkflowTemplate = {
  id: "tpl-wan21-t2v",
  name: "Text to Video (Wan2.1)",
  description:
    "Generate short videos from text prompts using the Wan2.1 model. Creates smooth, coherent video clips from descriptions.",
  category: "text-to-video",
  difficulty: "intermediate",
  exampleUseCase:
    "Create short animated clips, motion graphics, or video content from text descriptions.",
  requiredModels: [
    {
      name: "wan2.1_t2v_480p_bf16.safetensors",
      type: "checkpoint",
      downloadHint: "Download from Hugging Face: Wan-AI/Wan2.1-T2V-14B (use bf16 or fp8 quantized version)",
    },
  ],
  requiredCustomNodes: ["ComfyUI-VideoHelperSuite"],
  apiJson: {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: "wan2.1_t2v_480p_bf16.safetensors" },
    },
    "2": {
      class_type: "CLIPTextEncode",
      inputs: { text: "a cat walking in a garden, smooth motion", clip: ["1", 1] },
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: "bad quality, blurry, distorted",
        clip: ["1", 1],
      },
    },
    "4": {
      class_type: "EmptyLatentImage",
      inputs: { width: 832, height: 480, batch_size: 1 },
    },
    "5": {
      class_type: "KSampler",
      inputs: {
        seed: -1,
        steps: 30,
        cfg: 6.0,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1.0,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["4", 0],
      },
    },
    "6": {
      class_type: "VAEDecode",
      inputs: { samples: ["5", 0], vae: ["1", 2] },
    },
    "7": {
      class_type: "VHS_VideoCombine",
      inputs: {
        frame_rate: 16,
        loop_count: 0,
        filename_prefix: "Wan21",
        format: "video/h264-mp4",
        images: ["6", 0],
      },
      _meta: { title: "Video Output" },
    },
  },
  inputMappings: [
    { nodeId: "2", fieldName: "text", uiType: "prompt", label: "Prompt", defaultValue: "a cat walking in a garden, smooth motion" },
    { nodeId: "3", fieldName: "text", uiType: "negative_prompt", label: "Negative Prompt", defaultValue: "bad quality, blurry, distorted" },
    { nodeId: "1", fieldName: "ckpt_name", uiType: "checkpoint", label: "Checkpoint", defaultValue: "wan2.1_t2v_480p_bf16.safetensors" },
    { nodeId: "4", fieldName: "width", uiType: "width", label: "Width", defaultValue: 832 },
    { nodeId: "4", fieldName: "height", uiType: "height", label: "Height", defaultValue: 480 },
    { nodeId: "5", fieldName: "steps", uiType: "steps", label: "Steps", defaultValue: 30 },
    { nodeId: "5", fieldName: "cfg", uiType: "cfg", label: "CFG Scale", defaultValue: 6.0 },
    { nodeId: "5", fieldName: "seed", uiType: "seed", label: "Seed", defaultValue: -1 },
    { nodeId: "5", fieldName: "sampler_name", uiType: "sampler", label: "Sampler", defaultValue: "euler" },
    { nodeId: "5", fieldName: "scheduler", uiType: "scheduler", label: "Scheduler", defaultValue: "normal" },
  ],
  outputNodeId: "7",
};

// ============================================================
// Template: Image-to-Video (Wan2.1 I2V)
// ============================================================
const WAN21_I2V: WorkflowTemplate = {
  id: "tpl-wan21-i2v",
  name: "Image to Video (Wan2.1)",
  description:
    "Animate a still image into a short video using Wan2.1 image-to-video model. Upload an image and describe the desired motion.",
  category: "image-to-video",
  difficulty: "intermediate",
  exampleUseCase:
    "Animate portraits, bring landscapes to life, create product animations from still photos.",
  requiredModels: [
    {
      name: "wan2.1_i2v_480p_bf16.safetensors",
      type: "checkpoint",
      downloadHint: "Download from Hugging Face: Wan-AI/Wan2.1-I2V-14B (use bf16 or fp8 quantized version)",
    },
  ],
  requiredCustomNodes: ["ComfyUI-VideoHelperSuite"],
  apiJson: {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: "wan2.1_i2v_480p_bf16.safetensors" },
    },
    "2": {
      class_type: "LoadImage",
      inputs: { image: "input.png" },
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: { text: "gentle camera zoom in, slight movement", clip: ["1", 1] },
    },
    "4": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: "bad quality, blurry, static, frozen",
        clip: ["1", 1],
      },
    },
    "5": {
      class_type: "VAEEncode",
      inputs: { pixels: ["2", 0], vae: ["1", 2] },
    },
    "6": {
      class_type: "KSampler",
      inputs: {
        seed: -1,
        steps: 30,
        cfg: 6.0,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 0.85,
        model: ["1", 0],
        positive: ["3", 0],
        negative: ["4", 0],
        latent_image: ["5", 0],
      },
    },
    "7": {
      class_type: "VAEDecode",
      inputs: { samples: ["6", 0], vae: ["1", 2] },
    },
    "8": {
      class_type: "VHS_VideoCombine",
      inputs: {
        frame_rate: 16,
        loop_count: 0,
        filename_prefix: "Wan21_I2V",
        format: "video/h264-mp4",
        images: ["7", 0],
      },
      _meta: { title: "Video Output" },
    },
  },
  inputMappings: [
    { nodeId: "3", fieldName: "text", uiType: "prompt", label: "Motion Prompt", defaultValue: "gentle camera zoom in, slight movement" },
    { nodeId: "4", fieldName: "text", uiType: "negative_prompt", label: "Negative Prompt", defaultValue: "bad quality, blurry, static, frozen" },
    { nodeId: "2", fieldName: "image", uiType: "image_upload", label: "Input Image", defaultValue: "" },
    { nodeId: "1", fieldName: "ckpt_name", uiType: "checkpoint", label: "Checkpoint", defaultValue: "wan2.1_i2v_480p_bf16.safetensors" },
    { nodeId: "6", fieldName: "steps", uiType: "steps", label: "Steps", defaultValue: 30 },
    { nodeId: "6", fieldName: "cfg", uiType: "cfg", label: "CFG Scale", defaultValue: 6.0 },
    { nodeId: "6", fieldName: "seed", uiType: "seed", label: "Seed", defaultValue: -1 },
  ],
  outputNodeId: "8",
};

// ============================================================
// Template: Image Upscale (2x/4x)
// ============================================================
const IMAGE_UPSCALE: WorkflowTemplate = {
  id: "tpl-upscale-basic",
  name: "Image Upscale (2x)",
  description:
    "Upscale images to higher resolution using AI. Makes images larger while adding realistic detail, great for enhancing low-res images.",
  category: "text-to-image",
  difficulty: "beginner",
  exampleUseCase:
    "Enlarge AI-generated images, enhance photos, prepare images for print.",
  requiredModels: [
    {
      name: "RealESRGAN_x2plus.pth",
      type: "upscale_model",
      downloadHint: "Download from GitHub: xinntao/Real-ESRGAN (models section)",
    },
  ],
  requiredCustomNodes: [],
  apiJson: {
    "1": {
      class_type: "LoadImage",
      inputs: { image: "input.png" },
    },
    "2": {
      class_type: "UpscaleModelLoader",
      inputs: { model_name: "RealESRGAN_x2plus.pth" },
    },
    "3": {
      class_type: "ImageUpscaleWithModel",
      inputs: { upscale_model: ["2", 0], image: ["1", 0] },
    },
    "4": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "Upscaled", images: ["3", 0] },
    },
  },
  inputMappings: [
    { nodeId: "1", fieldName: "image", uiType: "image_upload", label: "Input Image", defaultValue: "" },
  ],
  outputNodeId: "4",
};

// ============================================================
// Registry
// ============================================================
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  SDXL_BASIC,
  FLUX_BASIC,
  WAN21_T2V,
  WAN21_I2V,
  IMAGE_UPSCALE,
];

export function getTemplate(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(
  category?: WorkflowCategory
): WorkflowTemplate[] {
  if (!category) return WORKFLOW_TEMPLATES;
  return WORKFLOW_TEMPLATES.filter((t) => t.category === category);
}
