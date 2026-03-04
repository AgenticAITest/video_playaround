export interface AppSettings {
  openRouterApiKey: string;
  openRouterModel: string;
  ngrokAuthToken: string;
  ngrokDomain: string;
  comfyuiUrl: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultSteps: number;
  defaultCfgScale: number;
  autoEnhancePrompt: boolean;
  theme: "dark" | "light" | "system";
}
