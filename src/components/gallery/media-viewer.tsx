"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Trash2,
  Sparkles,
  Image as ImageIcon,
  Film,
  PlayCircle,
} from "lucide-react";
import { formatDate, needsVideoElement } from "@/lib/utils";
import { useSettingsStore } from "@/lib/store/settings-store";
import type { GenerationRecord, OutputFile } from "@/types/generation";

interface MediaViewerProps {
  generation: GenerationRecord;
}

const modeIcons = {
  "text-to-image": ImageIcon,
  "text-to-video": Film,
  "image-to-video": PlayCircle,
};

const modeLabels = {
  "text-to-image": "Text to Image",
  "text-to-video": "Text to Video",
  "image-to-video": "Image to Video",
};

export function MediaViewer({ generation }: MediaViewerProps) {
  const router = useRouter();
  const comfyuiUrl = useSettingsStore((s) => s.comfyuiUrl);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeFile, setActiveFile] = useState<OutputFile | null>(
    generation.outputFiles[0] || null
  );

  const ModeIcon = modeIcons[generation.mode];

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
        const res = await fetch(getViewUrl(file));
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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/generations/${generation.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Generation deleted");
        router.push("/gallery");
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/gallery")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <ModeIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">
              {modeLabels[generation.mode]}
            </h2>
            <Badge variant="outline" className="text-xs">
              {generation.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDate(generation.createdAt)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="mr-2 h-3 w-3" />
          Delete
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Left: Media display */}
        <div className="space-y-4">
          {/* Main viewer */}
          {activeFile && (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                {needsVideoElement(activeFile.filename) ? (
                  <video
                    src={getViewUrl(activeFile)}
                    controls
                    autoPlay
                    loop
                    className="w-full bg-black"
                    style={{ maxHeight: 700 }}
                  />
                ) : (
                  <img
                    src={getViewUrl(activeFile)}
                    alt={generation.originalPrompt}
                    className="w-full object-contain bg-black/5"
                    style={{ maxHeight: 700 }}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Thumbnail strip for multiple outputs */}
          {generation.outputFiles.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {generation.outputFiles.map((file, idx) => (
                <button
                  key={`${file.filename}-${idx}`}
                  onClick={() => setActiveFile(file)}
                  className={`shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                    activeFile?.filename === file.filename
                      ? "border-primary"
                      : "border-transparent hover:border-border"
                  }`}
                >
                  {needsVideoElement(file.filename) ? (
                    <div className="flex h-16 w-16 items-center justify-center bg-muted">
                      <Film className="h-5 w-5 text-muted-foreground" />
                    </div>
                  ) : (
                    <img
                      src={getViewUrl(file)}
                      alt=""
                      className="h-16 w-16 object-cover"
                      loading="lazy"
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Download buttons */}
          {generation.outputFiles.length > 0 && (
            <div className="flex gap-2">
              {generation.outputFiles.map((file, idx) => (
                <Button
                  key={`dl-${idx}`}
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(file)}
                >
                  <Download className="mr-2 h-3 w-3" />
                  {file.filename}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="space-y-4">
          {/* Prompt */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Prompt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-relaxed">
                {generation.originalPrompt}
              </p>

              {generation.enhancedPrompt && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-primary" />
                      Enhanced Prompt
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/80">
                      {generation.enhancedPrompt}
                    </p>
                  </div>
                </>
              )}

              {generation.negativePrompt && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Negative Prompt
                    </p>
                    <p className="text-sm text-foreground/80">
                      {generation.negativePrompt}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Parameters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-muted-foreground">Size</span>
                <span>
                  {generation.params.width} x {generation.params.height}
                </span>
                <span className="text-muted-foreground">Steps</span>
                <span>{generation.params.steps}</span>
                <span className="text-muted-foreground">CFG Scale</span>
                <span>{generation.params.cfgScale}</span>
                <span className="text-muted-foreground">Seed</span>
                <span>{generation.params.seed === -1 ? "Random" : generation.params.seed}</span>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-muted-foreground">Mode</span>
                <span>{modeLabels[generation.mode]}</span>
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className="w-fit text-xs">
                  {generation.status}
                </Badge>
                <span className="text-muted-foreground">Created</span>
                <span className="text-xs">{formatDate(generation.createdAt)}</span>
                {generation.completedAt && (
                  <>
                    <span className="text-muted-foreground">Completed</span>
                    <span className="text-xs">
                      {formatDate(generation.completedAt)}
                    </span>
                  </>
                )}
                <span className="text-muted-foreground">Files</span>
                <span>{generation.outputFiles.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete confirmation */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Generation</DialogTitle>
            <DialogDescription>
              Are you sure? This removes the record from your gallery. The
              output files on ComfyUI are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
