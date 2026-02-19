"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Image, Film, PlayCircle, LayoutGrid, Music, ImagePlus, Disc3 } from "lucide-react";
import type { GenerationMode } from "@/types/generation";

interface GalleryFiltersProps {
  activeMode: GenerationMode | null;
  onModeChange: (mode: GenerationMode | null) => void;
  total: number;
}

const filters = [
  { mode: null, label: "All", icon: LayoutGrid },
  { mode: "text-to-image" as const, label: "Text to Image", icon: Image },
  { mode: "image-to-image" as const, label: "Image to Image", icon: ImagePlus },
  { mode: "text-to-video" as const, label: "Text to Video", icon: Film },
  { mode: "image-to-video" as const, label: "Image to Video", icon: PlayCircle },
  { mode: "text-to-music" as const, label: "Text to Music", icon: Music },
  { mode: "music-to-music" as const, label: "Music to Music", icon: Disc3 },
];

export function GalleryFilters({
  activeMode,
  onModeChange,
  total,
}: GalleryFiltersProps) {
  return (
    <div className="flex items-center gap-2">
      {filters.map((f) => {
        const Icon = f.icon;
        const isActive = activeMode === f.mode;
        return (
          <Button
            key={f.label}
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            className="gap-1.5"
            onClick={() => onModeChange(f.mode)}
          >
            <Icon className="h-3.5 w-3.5" />
            {f.label}
          </Button>
        );
      })}
      <Badge variant="outline" className="ml-auto text-xs">
        {total} generation{total !== 1 ? "s" : ""}
      </Badge>
    </div>
  );
}
