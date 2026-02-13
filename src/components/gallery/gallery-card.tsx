"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Film, Image as ImageIcon } from "lucide-react";
import { formatDate, truncate, needsVideoElement } from "@/lib/utils";
import type { GenerationRecord } from "@/types/generation";

interface GalleryCardProps {
  generation: GenerationRecord;
  comfyuiUrl: string;
}

const modeLabels = {
  "text-to-image": "Txt2Img",
  "text-to-video": "Txt2Vid",
  "image-to-video": "Img2Vid",
};

export function GalleryCard({ generation, comfyuiUrl }: GalleryCardProps) {
  const firstOutput = generation.outputFiles[0];
  const isVideo = firstOutput ? needsVideoElement(firstOutput.filename) : false;

  const thumbnailUrl = firstOutput
    ? `/api/comfyui/view?filename=${encodeURIComponent(firstOutput.filename)}&subfolder=${encodeURIComponent(firstOutput.subfolder)}&type=${firstOutput.type}&comfyuiUrl=${encodeURIComponent(comfyuiUrl)}`
    : null;

  return (
    <Link href={`/gallery/${generation.id}`}>
      <Card className="group overflow-hidden transition-all hover:border-primary/50 hover:shadow-md">
        <CardContent className="p-0">
          {/* Thumbnail */}
          <div className="relative aspect-square overflow-hidden bg-muted">
            {thumbnailUrl ? (
              isVideo ? (
                <video
                  src={thumbnailUrl}
                  muted
                  loop
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  onMouseEnter={(e) => e.currentTarget.play()}
                  onMouseLeave={(e) => {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = 0;
                  }}
                />
              ) : (
                <img
                  src={thumbnailUrl}
                  alt={generation.originalPrompt}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              )
            ) : (
              <div className="flex h-full items-center justify-center">
                {isVideo ? (
                  <Film className="h-8 w-8 text-muted-foreground" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
            )}

            {/* Mode badge overlay */}
            <Badge
              variant="secondary"
              className="absolute left-2 top-2 text-[10px] backdrop-blur"
            >
              {modeLabels[generation.mode]}
            </Badge>

            {/* Video indicator */}
            {isVideo && (
              <div className="absolute bottom-2 right-2">
                <Film className="h-4 w-4 text-white drop-shadow" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3">
            <p className="text-sm leading-snug line-clamp-2">
              {truncate(generation.originalPrompt, 80)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(generation.createdAt)}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
