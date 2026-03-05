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
import { NgrokStatus } from "./ngrok-status";
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
            Configure the connections for ComfyUI and OpenRouter
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* OpenRouter */}
          <div className="space-y-3">
            <Label htmlFor="openrouter-api-key">OpenRouter API Key</Label>
            <Input
              id="openrouter-api-key"
              type="password"
              value={settings.openRouterApiKey}
              onChange={(e) => settings.update({ openRouterApiKey: e.target.value })}
              placeholder="sk-or-v1-..."
            />
            <ConnectionStatus
              label="OpenRouter"
              url={settings.openRouterApiKey}
              endpoint="/api/openrouter/status"
            />
          </div>

          <Separator />

          {/* OpenRouter Model */}
          <div className="space-y-3">
            <Label htmlFor="openrouter-model">OpenRouter Model</Label>
            <Input
              id="openrouter-model"
              value={settings.openRouterModel}
              onChange={(e) =>
                settings.update({ openRouterModel: e.target.value })
              }
              placeholder="google/gemini-2.5-flash"
            />
            <p className="text-xs text-muted-foreground">
              Specific model name for prompt enhancement and workflow explanation.
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

      {/* Ngrok Tunnel */}
      <Card>
        <CardHeader>
          <CardTitle>Ngrok Tunnel</CardTitle>
          <CardDescription>
            Expose the local server via an ngrok tunnel. The tunnel starts
            automatically when an auth token is set and restarts on changes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="ngrok-auth-token">Auth Token</Label>
            <Input
              id="ngrok-auth-token"
              type="password"
              value={settings.ngrokAuthToken}
              onChange={(e) =>
                settings.update({ ngrokAuthToken: e.target.value })
              }
              placeholder="2abc..."
            />
            <p className="text-xs text-muted-foreground">
              Find your auth token at{" "}
              <a
                href="https://dashboard.ngrok.com/get-started/your-authtoken"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                dashboard.ngrok.com
              </a>
              .
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label htmlFor="ngrok-domain">Custom Domain</Label>
            <Input
              id="ngrok-domain"
              value={settings.ngrokDomain}
              onChange={(e) =>
                settings.update({ ngrokDomain: e.target.value })
              }
              placeholder="your-domain.ngrok-free.app (optional)"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use a randomly assigned ngrok URL.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Tunnel Status</Label>
            <NgrokStatus
              authToken={settings.ngrokAuthToken}
              domain={settings.ngrokDomain}
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
                Automatically enhance prompts with OpenRouter before generating
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
