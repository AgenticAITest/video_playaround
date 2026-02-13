"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { useSettingsStore } from "@/lib/store/settings-store";

interface ImageUploaderProps {
  uploadedFilename: string | null;
  onUpload: (filename: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function ImageUploader({
  uploadedFilename,
  onUpload,
  onRemove,
  disabled,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const comfyuiUrl = useSettingsStore((s) => s.comfyuiUrl);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      // Show local preview
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
        toast.success("Image uploaded to ComfyUI");
      } catch {
        toast.error("Failed to upload image");
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
      <Label>Input Image</Label>

      {uploadedFilename ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Input"
              className="h-48 w-full object-contain bg-black/20"
            />
          )}
          <div className="flex items-center justify-between p-2">
            <span className="truncate text-xs text-muted-foreground">
              {uploadedFilename}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
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
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag & drop an image or click to browse
              </p>
              <input
                type="file"
                accept="image/*"
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
