/**
 * Curated friendly names and descriptions for common ComfyUI node types.
 * Used by the import wizard to explain workflows in plain English.
 */

export interface NodeDescription {
  friendlyName: string;
  description: string;
  category: "loader" | "sampler" | "conditioning" | "latent" | "image" | "video" | "upscale" | "controlnet" | "mask" | "utility" | "output" | "other";
}

export const NODE_DESCRIPTIONS: Record<string, NodeDescription> = {
  // --- Loaders ---
  CheckpointLoaderSimple: {
    friendlyName: "Model Loader",
    description: "Loads the main AI model (checkpoint) that generates images. This is the core model that determines the style and capabilities of your generations.",
    category: "loader",
  },
  CheckpointLoader: {
    friendlyName: "Model Loader (Advanced)",
    description: "Loads an AI model with separate config selection. Same as the simple loader but with more control.",
    category: "loader",
  },
  UNETLoader: {
    friendlyName: "UNET Model Loader",
    description: "Loads just the UNET (diffusion) part of a model. Used for newer architectures like Flux that separate model components.",
    category: "loader",
  },
  DualCLIPLoader: {
    friendlyName: "Dual CLIP Loader",
    description: "Loads two CLIP text encoders. Required by models like Flux and SDXL that use dual text understanding.",
    category: "loader",
  },
  CLIPLoader: {
    friendlyName: "CLIP Text Encoder Loader",
    description: "Loads the CLIP model that translates your text prompt into something the AI model understands.",
    category: "loader",
  },
  VAELoader: {
    friendlyName: "VAE Loader",
    description: "Loads the VAE (image encoder/decoder). This converts between the AI's internal representation and actual images.",
    category: "loader",
  },
  LoraLoader: {
    friendlyName: "LoRA Loader",
    description: "Loads a LoRA fine-tune that modifies the base model's style or capabilities. LoRAs are small add-ons that teach the model new concepts.",
    category: "loader",
  },
  LoraLoaderModelOnly: {
    friendlyName: "LoRA Loader (Model Only)",
    description: "Loads a LoRA that only modifies the model weights, not the text encoder.",
    category: "loader",
  },
  ControlNetLoader: {
    friendlyName: "ControlNet Loader",
    description: "Loads a ControlNet model that guides image generation using reference images (poses, edges, depth maps).",
    category: "controlnet",
  },
  LoadImage: {
    friendlyName: "Image Input",
    description: "Loads an input image for workflows that need a reference image, such as image-to-video or img2img.",
    category: "image",
  },
  LoadImageMask: {
    friendlyName: "Image Mask Input",
    description: "Loads an image with a mask for inpainting (editing specific parts of an image).",
    category: "mask",
  },
  UpscaleModelLoader: {
    friendlyName: "Upscale Model Loader",
    description: "Loads a dedicated upscaling model (like RealESRGAN) for making images larger and sharper.",
    category: "upscale",
  },

  // --- Conditioning (text/prompt) ---
  CLIPTextEncode: {
    friendlyName: "Text Prompt",
    description: "Converts your text prompt into a format the AI model can use. Most workflows have two: one for what you want, one for what to avoid.",
    category: "conditioning",
  },
  CLIPTextEncodeSDXL: {
    friendlyName: "SDXL Text Prompt",
    description: "SDXL-specific text encoding with separate fields for base and refiner prompts.",
    category: "conditioning",
  },
  CLIPTextEncodeFlux: {
    friendlyName: "Flux Text Prompt",
    description: "Flux-specific text encoding with guidance strength control.",
    category: "conditioning",
  },
  ConditioningCombine: {
    friendlyName: "Combine Conditions",
    description: "Merges multiple text prompts or conditions together to influence the generation.",
    category: "conditioning",
  },
  ConditioningSetArea: {
    friendlyName: "Regional Prompt",
    description: "Applies a prompt to only a specific area of the image, useful for controlling different parts separately.",
    category: "conditioning",
  },
  ControlNetApply: {
    friendlyName: "Apply ControlNet",
    description: "Applies a ControlNet to guide the image generation using a reference image (for poses, edges, etc.).",
    category: "controlnet",
  },
  ControlNetApplyAdvanced: {
    friendlyName: "Apply ControlNet (Advanced)",
    description: "Applies ControlNet with more fine-grained control over strength and timing.",
    category: "controlnet",
  },

  // --- Latent / Sampling ---
  EmptyLatentImage: {
    friendlyName: "Image Size",
    description: "Sets the output image dimensions (width and height). This is where you control the resolution.",
    category: "latent",
  },
  EmptySD3LatentImage: {
    friendlyName: "SD3 Image Size",
    description: "Sets image dimensions for Stable Diffusion 3 models.",
    category: "latent",
  },
  EmptyHunyuanLatentVideo: {
    friendlyName: "Video Size (Hunyuan)",
    description: "Sets the video dimensions and frame count for Hunyuan video generation.",
    category: "latent",
  },
  KSampler: {
    friendlyName: "Sampler",
    description: "The core generation engine. Controls steps (quality/speed), CFG (prompt adherence), seed (reproducibility), and sampling method.",
    category: "sampler",
  },
  KSamplerAdvanced: {
    friendlyName: "Sampler (Advanced)",
    description: "Advanced sampler with control over start/end steps, useful for multi-pass generation and fine-tuning.",
    category: "sampler",
  },
  SamplerCustom: {
    friendlyName: "Custom Sampler",
    description: "Modular sampler that lets you mix and match different sampling algorithms and schedulers.",
    category: "sampler",
  },
  SamplerCustomAdvanced: {
    friendlyName: "Custom Sampler (Advanced)",
    description: "The most flexible sampler — builds the sampling pipeline from individual components.",
    category: "sampler",
  },
  KSamplerSelect: {
    friendlyName: "Sampler Selector",
    description: "Selects which sampling algorithm to use (euler, dpm++, etc). Different algorithms produce different results.",
    category: "sampler",
  },
  BasicScheduler: {
    friendlyName: "Step Scheduler",
    description: "Controls how noise is reduced over the generation steps. Affects the progression from noise to final image.",
    category: "sampler",
  },
  BasicGuider: {
    friendlyName: "CFG Guider",
    description: "Controls how strongly the generation follows your prompt (CFG scale).",
    category: "sampler",
  },
  RandomNoise: {
    friendlyName: "Random Seed",
    description: "Generates the initial random noise. The seed value controls reproducibility — same seed = same result.",
    category: "sampler",
  },

  // --- Image Processing ---
  VAEDecode: {
    friendlyName: "Decode to Image",
    description: "Converts the AI's internal representation back into a visible image. This is the final decoding step.",
    category: "image",
  },
  VAEEncode: {
    friendlyName: "Encode to Latent",
    description: "Converts a real image into the AI's internal format, used for img2img and inpainting workflows.",
    category: "image",
  },
  ImageScale: {
    friendlyName: "Resize Image",
    description: "Resizes an image to a specific width and height.",
    category: "image",
  },
  ImageScaleBy: {
    friendlyName: "Scale Image",
    description: "Scales an image by a multiplier (e.g., 2x larger).",
    category: "image",
  },
  ImageUpscaleWithModel: {
    friendlyName: "AI Upscale",
    description: "Uses an AI upscaling model to increase image resolution while adding detail.",
    category: "upscale",
  },
  ImageSharpen: {
    friendlyName: "Sharpen Image",
    description: "Applies sharpening to make the image crisper.",
    category: "image",
  },
  ImageBlend: {
    friendlyName: "Blend Images",
    description: "Blends two images together with adjustable opacity.",
    category: "image",
  },
  ImageBatch: {
    friendlyName: "Batch Images",
    description: "Combines multiple images into a batch for processing together.",
    category: "image",
  },

  // --- Video ---
  "VHS_VideoCombine": {
    friendlyName: "Video Output",
    description: "Combines generated frames into a video file. Controls format, frame rate, and compression.",
    category: "video",
  },
  "Wan_Fun_InP_Sampler": {
    friendlyName: "Wan Fun Sampler",
    description: "Specialized sampler for Wan2.1 video generation model.",
    category: "video",
  },
  "DownloadAndLoadWan2_1Model": {
    friendlyName: "Wan2.1 Model Loader",
    description: "Downloads and loads the Wan2.1 video generation model.",
    category: "video",
  },
  "SVD_img2vid_Conditioning": {
    friendlyName: "SVD Conditioning",
    description: "Prepares an input image for Stable Video Diffusion (image-to-video) generation.",
    category: "video",
  },
  "ImageOnlyCheckpointLoader": {
    friendlyName: "Video Model Loader",
    description: "Loads a video model checkpoint (like SVD) that only processes images/video.",
    category: "video",
  },

  // --- Output ---
  SaveImage: {
    friendlyName: "Save Image",
    description: "Saves the generated image to a file. This is the final output node for image workflows.",
    category: "output",
  },
  PreviewImage: {
    friendlyName: "Preview Image",
    description: "Shows a preview of the image without saving to disk.",
    category: "output",
  },
  SaveAnimatedWebP: {
    friendlyName: "Save Animated WebP",
    description: "Saves generated frames as an animated WebP file.",
    category: "output",
  },
  SaveAnimatedPNG: {
    friendlyName: "Save Animated PNG",
    description: "Saves generated frames as an animated PNG (APNG) file.",
    category: "output",
  },
  SaveVideo: {
    friendlyName: "Save Video",
    description: "Saves generated frames as a video file.",
    category: "output",
  },

  // --- Utility ---
  "CLIPSetLastLayer": {
    friendlyName: "CLIP Skip",
    description: "Controls CLIP skip — adjusts which layer of text understanding to use. Higher skip can produce more artistic results.",
    category: "utility",
  },
  "ModelSamplingFlux": {
    friendlyName: "Flux Sampling Config",
    description: "Configures sampling parameters specific to Flux models.",
    category: "utility",
  },
  "FluxGuidance": {
    friendlyName: "Flux Guidance",
    description: "Controls guidance strength for Flux models. Higher values follow the prompt more closely.",
    category: "utility",
  },
  LatentUpscale: {
    friendlyName: "Upscale Latent",
    description: "Upscales in the AI's internal space (cheaper than pixel-space upscale). Used in hi-res fix workflows.",
    category: "latent",
  },
  LatentUpscaleBy: {
    friendlyName: "Scale Latent",
    description: "Scales the latent by a multiplier for resolution changes during generation.",
    category: "latent",
  },
};

/**
 * Get a friendly description for a node type.
 * Falls back to a generic description if not in the catalog.
 */
export function getNodeDescription(classType: string): NodeDescription {
  return NODE_DESCRIPTIONS[classType] ?? {
    friendlyName: classType.replace(/([A-Z])/g, " $1").trim(),
    description: `A ComfyUI node of type "${classType}".`,
    category: "other",
  };
}

/**
 * Get just the friendly name for a node type.
 */
export function getNodeFriendlyName(classType: string): string {
  return NODE_DESCRIPTIONS[classType]?.friendlyName ?? classType.replace(/([A-Z])/g, " $1").trim();
}
