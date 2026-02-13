"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { useSettingsStore } from "@/lib/store/settings-store";
import { needsVideoElement } from "@/lib/utils";
import type { OutputFile } from "@/types/generation";

interface OutputDisplayProps {
  outputFiles: OutputFile[];
}

export function OutputDisplay({ outputFiles }: OutputDisplayProps) {
  const comfyuiUrl = useSettingsStore((s) => s.comfyuiUrl);

  const getViewUrl = useCallback(
    (file: OutputFile) => {
      const params = new URLSearchParams({
        filename: file.filename,
        subfolder: file.subfolder,
        type: file.type,
        comfyuiUrl,
      });
      return `/api/comfyui/view?${params.toString()}`;
    },
    [comfyuiUrl]
  );

  const handleDownload = useCallback(
    async (file: OutputFile) => {
      try {
        const url = getViewUrl(file);
        const res = await fetch(url);
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = file.filename;
        a.click();
        URL.revokeObjectURL(a.href);
      } catch {
        toast.error("Download failed");
      }
    },
    [getViewUrl]
  );

  if (outputFiles.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">Output</h3>
        <Badge variant="secondary" className="text-xs">
          {outputFiles.length} file{outputFiles.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {outputFiles.map((file, idx) => (
          <Card key={`${file.filename}-${idx}`} className="overflow-hidden">
            <CardContent className="p-0">
              {needsVideoElement(file.filename) ? (
                <video
                  src={getViewUrl(file)}
                  controls
                  autoPlay
                  loop
                  muted
                  className="w-full bg-black"
                  style={{ maxHeight: 512 }}
                />
              ) : (
                <img
                  src={getViewUrl(file)}
                  alt={file.filename}
                  className="w-full object-contain bg-black/10"
                  style={{ maxHeight: 512 }}
                />
              )}

              <div className="flex items-center justify-between p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-muted-foreground">
                    {file.filename}
                  </p>
                  <Badge
                    variant="outline"
                    className="mt-1 text-[10px]"
                  >
                    {file.mediaType}
                  </Badge>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDownload(file)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
