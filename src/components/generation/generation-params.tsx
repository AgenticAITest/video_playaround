"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Shuffle, Loader2 } from "lucide-react";
import { RESOLUTION_PRESETS, SAMPLER_OPTIONS, SCHEDULER_OPTIONS } from "@/lib/constants";
import { useSettingsStore } from "@/lib/store/settings-store";
import type { GenerationParams } from "@/types/generation";
import type { InputMapping } from "@/types/workflow";

interface GenerationParamsProps {
  params: GenerationParams;
  onChange: (params: GenerationParams) => void;
  mappings: InputMapping[];
  disabled?: boolean;
}

export function GenerationParamsPanel({
  params,
  onChange,
  mappings,
  disabled,
}: GenerationParamsProps) {
  const settings = useSettingsStore();
  const update = (partial: Partial<GenerationParams>) => {
    onChange({ ...params, ...partial });
  };

  // Determine which controls to show based on mappings
  const has = (uiType: string) =>
    mappings.some((m) => m.uiType === uiType);

  const hasWidth = has("width");
  const hasHeight = has("height");
  const hasSteps = has("steps");
  const hasCfg = has("cfg");
  const hasSeed = has("seed");
  const hasSampler = has("sampler");
  const hasScheduler = has("scheduler");
  const hasCheckpoint = has("checkpoint");

  // Fetch available checkpoints from ComfyUI
  const [checkpoints, setCheckpoints] = useState<string[]>([]);
  const [loadingCheckpoints, setLoadingCheckpoints] = useState(false);

  useEffect(() => {
    if (!hasCheckpoint) return;

    setLoadingCheckpoints(true);
    fetch(`/api/comfyui/checkpoints?comfyuiUrl=${encodeURIComponent(settings.comfyuiUrl)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.checkpoints?.length > 0) {
          setCheckpoints(data.checkpoints);
          // Set default from mapping if not already set
          const ckptMapping = mappings.find((m) => m.uiType === "checkpoint");
          if (ckptMapping && !params.ckpt_name) {
            update({ ckpt_name: ckptMapping.defaultValue as string });
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCheckpoints(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasCheckpoint, settings.comfyuiUrl]);

  // If no mappings at all, show nothing
  if (mappings.filter((m) => !["prompt", "negative_prompt", "image_upload"].includes(m.uiType)).length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Parameters</Label>

      {/* Checkpoint */}
      {hasCheckpoint && (
        <div className="space-y-1">
          <Label className="text-xs">Checkpoint</Label>
          {loadingCheckpoints ? (
            <div className="flex items-center gap-2 h-8 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading models...
            </div>
          ) : checkpoints.length > 0 ? (
            <Select
              value={(params as Record<string, unknown>).ckpt_name as string || ""}
              onValueChange={(v) =>
                update({ ckpt_name: v } as Partial<GenerationParams>)
              }
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select checkpoint..." />
              </SelectTrigger>
              <SelectContent>
                {checkpoints.map((name) => (
                  <SelectItem key={name} value={name} className="text-xs">
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-xs text-muted-foreground">
              Could not load checkpoint list from ComfyUI
            </p>
          )}
        </div>
      )}

      {/* Resolution */}
      {(hasWidth || hasHeight) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Resolution</Label>
            <div className="flex flex-wrap gap-1">
              {RESOLUTION_PRESETS.slice(0, 5).map((preset) => (
                <Button
                  key={preset.label}
                  variant={
                    params.width === preset.width &&
                    params.height === preset.height
                      ? "secondary"
                      : "ghost"
                  }
                  size="sm"
                  className="h-6 text-[10px]"
                  disabled={disabled}
                  onClick={() =>
                    update({ width: preset.width, height: preset.height })
                  }
                >
                  {preset.width}x{preset.height}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {hasWidth && (
              <div className="space-y-1">
                <Label className="text-xs">Width</Label>
                <Input
                  type="number"
                  value={params.width}
                  onChange={(e) =>
                    update({ width: parseInt(e.target.value) || 512 })
                  }
                  min={64}
                  max={4096}
                  step={64}
                  disabled={disabled}
                  className="h-8 text-sm"
                />
              </div>
            )}
            {hasHeight && (
              <div className="space-y-1">
                <Label className="text-xs">Height</Label>
                <Input
                  type="number"
                  value={params.height}
                  onChange={(e) =>
                    update({ height: parseInt(e.target.value) || 512 })
                  }
                  min={64}
                  max={4096}
                  step={64}
                  disabled={disabled}
                  className="h-8 text-sm"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Steps */}
      {hasSteps && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Steps</Label>
            <span className="text-xs text-muted-foreground">
              {params.steps}
            </span>
          </div>
          <Slider
            value={[params.steps]}
            onValueChange={([v]) => update({ steps: v })}
            min={1}
            max={150}
            step={1}
            disabled={disabled}
          />
        </div>
      )}

      {/* CFG Scale */}
      {hasCfg && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">CFG Scale</Label>
            <span className="text-xs text-muted-foreground">
              {params.cfgScale.toFixed(1)}
            </span>
          </div>
          <Slider
            value={[params.cfgScale]}
            onValueChange={([v]) => update({ cfgScale: v })}
            min={1}
            max={30}
            step={0.5}
            disabled={disabled}
          />
        </div>
      )}

      {/* Seed */}
      {hasSeed && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Seed</Label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Random</span>
              <Switch
                checked={params.seed === -1}
                onCheckedChange={(checked) =>
                  update({ seed: checked ? -1 : 42 })
                }
                disabled={disabled}
              />
            </div>
          </div>
          {params.seed !== -1 && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={params.seed}
                onChange={(e) =>
                  update({ seed: parseInt(e.target.value) || 0 })
                }
                disabled={disabled}
                className="h-8 text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                disabled={disabled}
                onClick={() =>
                  update({ seed: Math.floor(Math.random() * 2 ** 32) })
                }
              >
                <Shuffle className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Sampler & Scheduler */}
      <div className="grid grid-cols-2 gap-3">
        {hasSampler && (
          <div className="space-y-1">
            <Label className="text-xs">Sampler</Label>
            <Select
              value={(params as Record<string, unknown>).sampler_name as string || "euler"}
              onValueChange={(v) =>
                update({ sampler_name: v } as Partial<GenerationParams>)
              }
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SAMPLER_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {hasScheduler && (
          <div className="space-y-1">
            <Label className="text-xs">Scheduler</Label>
            <Select
              value={(params as Record<string, unknown>).scheduler as string || "normal"}
              onValueChange={(v) =>
                update({ scheduler: v } as Partial<GenerationParams>)
              }
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULER_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
