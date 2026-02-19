import type { AppSettings } from "@/types/settings";

export const DEFAULT_SETTINGS: AppSettings = {
  lmStudioUrl: "http://localhost:1234",
  lmStudioModel: "",
  comfyuiUrl: "http://localhost:8188",
  defaultWidth: 1024,
  defaultHeight: 1024,
  defaultSteps: 20,
  defaultCfgScale: 7.0,
  autoEnhancePrompt: true,
  theme: "dark",
};

export const GENERATION_MODES = [
  { value: "text-to-image" as const, label: "Text to Image", icon: "Image" },
  { value: "image-to-image" as const, label: "Image to Image", icon: "ImagePlus" },
  { value: "text-to-video" as const, label: "Text to Video", icon: "Film" },
  { value: "image-to-video" as const, label: "Image to Video", icon: "VideoIcon" },
  { value: "text-to-music" as const, label: "Text to Music", icon: "Music" },
  { value: "music-to-music" as const, label: "Music to Music", icon: "Disc3" },
] as const;

export const RESOLUTION_PRESETS = [
  { label: "512 x 512", width: 512, height: 512 },
  { label: "768 x 768", width: 768, height: 768 },
  { label: "1024 x 1024", width: 1024, height: 1024 },
  { label: "1024 x 576 (16:9)", width: 1024, height: 576 },
  { label: "576 x 1024 (9:16)", width: 576, height: 1024 },
  { label: "1280 x 720 (HD)", width: 1280, height: 720 },
  { label: "1920 x 1080 (FHD)", width: 1920, height: 1080 },
] as const;

export const SAMPLER_OPTIONS = [
  "euler",
  "euler_ancestral",
  "heun",
  "dpm_2",
  "dpm_2_ancestral",
  "lms",
  "dpm_fast",
  "dpm_adaptive",
  "dpmpp_2s_ancestral",
  "dpmpp_sde",
  "dpmpp_2m",
  "dpmpp_2m_sde",
  "dpmpp_3m_sde",
  "ddim",
  "uni_pc",
] as const;

export const SCHEDULER_OPTIONS = [
  "normal",
  "karras",
  "exponential",
  "sgm_uniform",
  "simple",
  "ddim_uniform",
  "beta",
] as const;
