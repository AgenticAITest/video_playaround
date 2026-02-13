"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from "lucide-react";

interface PromptInputProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  negativePrompt: string;
  onNegativePromptChange: (value: string) => void;
  enhancedPrompt: string | null;
  onEnhance: () => void;
  onClearEnhanced: () => void;
  enhancing: boolean;
  disabled?: boolean;
}

export function PromptInput({
  prompt,
  onPromptChange,
  negativePrompt,
  onNegativePromptChange,
  enhancedPrompt,
  onEnhance,
  onClearEnhanced,
  enhancing,
  disabled,
}: PromptInputProps) {
  const [showNegative, setShowNegative] = useState(false);

  return (
    <div className="space-y-3">
      {/* Main Prompt */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Prompt</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={onEnhance}
            disabled={!prompt.trim() || enhancing || disabled}
            className="h-7 gap-1.5 text-xs"
          >
            <Sparkles className="h-3 w-3" />
            {enhancing ? "Enhancing..." : "Enhance"}
          </Button>
        </div>
        <Textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Describe what you want to generate..."
          rows={3}
          disabled={disabled}
        />
      </div>

      {/* Enhanced Prompt */}
      {enhancing && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-primary" />
            Enhanced Prompt
          </Label>
          <Skeleton className="h-20 w-full" />
        </div>
      )}

      {enhancedPrompt && !enhancing && (
        <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3 min-w-0">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-xs">
              <Sparkles className="h-3 w-3 text-primary" />
              Enhanced Prompt
              <Badge variant="secondary" className="text-[10px]">
                AI
              </Badge>
            </Label>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 text-xs"
              onClick={onClearEnhanced}
            >
              <RotateCcw className="h-3 w-3" />
              Use Original
            </Button>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed break-words overflow-hidden">
            {enhancedPrompt}
          </p>
        </div>
      )}

      {/* Negative Prompt Toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1 text-xs text-muted-foreground"
        onClick={() => setShowNegative(!showNegative)}
      >
        {showNegative ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        Negative Prompt
      </Button>

      {showNegative && (
        <Textarea
          value={negativePrompt}
          onChange={(e) => onNegativePromptChange(e.target.value)}
          placeholder="What to avoid in the generation..."
          rows={2}
          disabled={disabled}
        />
      )}
    </div>
  );
}
