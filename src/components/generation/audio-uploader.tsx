"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, X, Loader2, Music } from "lucide-react";
import { useSettingsStore } from "@/lib/store/settings-store";

interface AudioUploaderProps {
  uploadedFilename: string | null;
  onUpload: (filename: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function AudioUploader({
  uploadedFilename,
  onUpload,
  onRemove,
  disabled,
}: AudioUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const comfyuiUrl = useSettingsStore((s) => s.comfyuiUrl);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("audio/")) {
        toast.error("Please upload an audio file (mp3, wav, flac, ogg)");
        return;
      }

      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("image", file);
        formData.append("comfyuiUrl", comfyuiUrl);

        const res = await fetch("/api/comfyui/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          throw new Error("Upload failed");
        }

        const data = await res.json();
        onUpload(data.name);
        toast.success("Audio uploaded to ComfyUI");
      } catch {
        toast.error("Failed to upload audio");
        setPreviewUrl(null);
      } finally {
        setUploading(false);
      }
    },
    [comfyuiUrl, onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-2">
      <Label>Input Audio</Label>

      {uploadedFilename ? (
        <div className="rounded-lg border border-border p-3 space-y-2">
          {previewUrl && (
            <audio
              ref={audioRef}
              src={previewUrl}
              controls
              className="w-full"
            />
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <Music className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-xs text-muted-foreground">
                {uploadedFilename}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => {
                onRemove();
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <Music className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag & drop an audio file or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                MP3, WAV, FLAC, OGG
              </p>
              <input
                type="file"
                accept="audio/*"
                disabled={disabled}
                className="absolute inset-0 cursor-pointer opacity-0"
                style={{ position: "relative" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
