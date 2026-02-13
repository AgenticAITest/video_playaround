"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import type { InputMapping, InputUIType } from "@/types/workflow";
import { getUITypeLabel } from "@/lib/comfyui/workflow-utils";

const UI_TYPE_OPTIONS: { value: InputUIType; label: string }[] = [
  { value: "prompt", label: "Prompt" },
  { value: "negative_prompt", label: "Negative Prompt" },
  { value: "image_upload", label: "Image Upload" },
  { value: "width", label: "Width" },
  { value: "height", label: "Height" },
  { value: "steps", label: "Steps" },
  { value: "cfg", label: "CFG Scale" },
  { value: "seed", label: "Seed" },
  { value: "sampler", label: "Sampler" },
  { value: "scheduler", label: "Scheduler" },
  { value: "custom", label: "Custom" },
];

interface NodeInputMapperProps {
  mapping: InputMapping;
  nodeClassType: string;
  onUpdate: (updated: InputMapping) => void;
  onRemove: () => void;
}

export function NodeInputMapper({
  mapping,
  nodeClassType,
  onUpdate,
  onRemove,
}: NodeInputMapperProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
      {/* Node info */}
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {mapping.nodeId}
          </Badge>
          <span className="text-xs text-muted-foreground">{nodeClassType}</span>
          <Badge variant="secondary" className="text-xs">
            .{mapping.fieldName}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* UI Type */}
          <div className="space-y-1">
            <Label className="text-xs">Map to</Label>
            <Select
              value={mapping.uiType}
              onValueChange={(val) =>
                onUpdate({
                  ...mapping,
                  uiType: val as InputUIType,
                  label: getUITypeLabel(val as InputUIType),
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UI_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Label */}
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input
              value={mapping.label}
              onChange={(e) =>
                onUpdate({ ...mapping, label: e.target.value })
              }
              className="h-8 text-xs"
              placeholder="Display label"
            />
          </div>
        </div>

        {/* Default value */}
        <div className="space-y-1">
          <Label className="text-xs">Default value</Label>
          <Input
            value={String(mapping.defaultValue ?? "")}
            onChange={(e) =>
              onUpdate({ ...mapping, defaultValue: e.target.value })
            }
            className="h-8 text-xs"
            placeholder="Default"
          />
        </div>
      </div>

      {/* Remove */}
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
