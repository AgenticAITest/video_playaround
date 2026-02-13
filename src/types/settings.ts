export interface AppSettings {
  lmStudioUrl: string;
  lmStudioModel: string;
  comfyuiUrl: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultSteps: number;
  defaultCfgScale: number;
  autoEnhancePrompt: boolean;
  theme: "dark" | "light" | "system";
}
