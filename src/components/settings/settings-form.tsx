"use client";

import { useSettingsStore } from "@/lib/store/settings-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConnectionStatus } from "./connection-status";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

export function SettingsForm() {
  const settings = useSettingsStore();

  return (
    <div className="space-y-6">
      {/* Backend Connections */}
      <Card>
        <CardHeader>
          <CardTitle>Backend Connections</CardTitle>
          <CardDescription>
            Configure the URLs for LM Studio and ComfyUI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* LM Studio */}
          <div className="space-y-3">
            <Label htmlFor="lm-studio-url">LM Studio URL</Label>
            <Input
              id="lm-studio-url"
              value={settings.lmStudioUrl}
              onChange={(e) => settings.update({ lmStudioUrl: e.target.value })}
              placeholder="http://localhost:1234"
            />
            <ConnectionStatus
              label="LM Studio"
              url={settings.lmStudioUrl}
              endpoint="/api/lmstudio/status"
            />
          </div>

          <Separator />

          {/* LM Studio Model */}
          <div className="space-y-3">
            <Label htmlFor="lm-studio-model">LM Studio Model (optional)</Label>
            <Input
              id="lm-studio-model"
              value={settings.lmStudioModel}
              onChange={(e) =>
                settings.update({ lmStudioModel: e.target.value })
              }
              placeholder="Leave empty to auto-detect"
            />
            <p className="text-xs text-muted-foreground">
              Specific model name for prompt enhancement. Leave empty to use whatever is loaded.
            </p>
          </div>

          <Separator />

          {/* ComfyUI */}
          <div className="space-y-3">
            <Label htmlFor="comfyui-url">ComfyUI URL</Label>
            <Input
              id="comfyui-url"
              value={settings.comfyuiUrl}
              onChange={(e) => settings.update({ comfyuiUrl: e.target.value })}
              placeholder="http://localhost:8188"
            />
            <ConnectionStatus
              label="ComfyUI"
              url={settings.comfyuiUrl}
              endpoint="/api/comfyui/status"
            />
          </div>
        </CardContent>
      </Card>

      {/* Generation Defaults */}
      <Card>
        <CardHeader>
          <CardTitle>Generation Defaults</CardTitle>
          <CardDescription>
            Default parameters for new generations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resolution */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="default-width">Default Width</Label>
              <Input
                id="default-width"
                type="number"
                value={settings.defaultWidth}
                onChange={(e) =>
                  settings.update({ defaultWidth: parseInt(e.target.value) || 1024 })
                }
                min={64}
                max={4096}
                step={64}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-height">Default Height</Label>
              <Input
                id="default-height"
                type="number"
                value={settings.defaultHeight}
                onChange={(e) =>
                  settings.update({ defaultHeight: parseInt(e.target.value) || 1024 })
                }
                min={64}
                max={4096}
                step={64}
              />
            </div>
          </div>

          <Separator />

          {/* Steps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Default Steps</Label>
              <span className="text-sm text-muted-foreground">
                {settings.defaultSteps}
              </span>
            </div>
            <Slider
              value={[settings.defaultSteps]}
              onValueChange={([val]) => settings.update({ defaultSteps: val })}
              min={1}
              max={150}
              step={1}
            />
          </div>

          {/* CFG Scale */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Default CFG Scale</Label>
              <span className="text-sm text-muted-foreground">
                {settings.defaultCfgScale.toFixed(1)}
              </span>
            </div>
            <Slider
              value={[settings.defaultCfgScale]}
              onValueChange={([val]) =>
                settings.update({ defaultCfgScale: val })
              }
              min={1}
              max={30}
              step={0.5}
            />
          </div>

          <Separator />

          {/* Auto-enhance */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-enhance Prompts</Label>
              <p className="text-xs text-muted-foreground">
                Automatically enhance prompts with LM Studio before generating
              </p>
            </div>
            <Switch
              checked={settings.autoEnhancePrompt}
              onCheckedChange={(checked) =>
                settings.update({ autoEnhancePrompt: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Reset */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => {
            settings.reset();
            toast.success("Settings reset to defaults");
          }}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}
