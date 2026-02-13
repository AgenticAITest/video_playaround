"use client";

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Clock,
  AlertTriangle,
  ListOrdered,
} from "lucide-react";
import type { GenerationStatus } from "@/types/generation";

interface ProgressDisplayProps {
  status: GenerationStatus;
  progress: number;
  progressValue?: number;
  progressMax?: number;
  currentNode: string | null;
  previewBlob: Blob | null;
  error: string | null;
  elapsedMs?: number;
  queueRemaining?: number;
  stalled?: boolean;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

export function ProgressDisplay({
  status,
  progress,
  progressValue = 0,
  progressMax = 0,
  currentNode,
  previewBlob,
  error,
  elapsedMs = 0,
  queueRemaining = 0,
  stalled = false,
}: ProgressDisplayProps) {
  if (status === "idle") return null;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      {/* Status header */}
      <div className="flex items-center gap-2">
        {status === "enhancing" && (
          <>
            <Sparkles className="h-4 w-4 animate-pulse text-primary" />
            <span className="text-sm font-medium">Enhancing prompt...</span>
          </>
        )}
        {status === "queued" && (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-medium">Queued, waiting...</span>
            {queueRemaining > 1 && (
              <Badge variant="outline" className="gap-1 text-xs">
                <ListOrdered className="h-3 w-3" />
                {queueRemaining} in queue
              </Badge>
            )}
          </>
        )}
        {status === "processing" && (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm font-medium">Generating...</span>
            {currentNode && (
              <Badge variant="outline" className="text-xs font-mono">
                Node {currentNode}
              </Badge>
            )}
          </>
        )}
        {status === "completed" && (
          <>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-green-500">
              Complete!
            </span>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-destructive">
              Error
            </span>
          </>
        )}

        {/* Elapsed time — shown for all active + finished states */}
        {elapsedMs > 0 && (
          <Badge variant="secondary" className="ml-auto gap-1 text-xs">
            <Clock className="h-3 w-3" />
            {formatElapsed(elapsedMs)}
          </Badge>
        )}
      </div>

      {/* Progress bar + step info */}
      {(status === "processing" || status === "completed") && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
          {status === "processing" && (
            <div className="flex items-center justify-between">
              {progressMax > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Step {progressValue}/{progressMax}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Preparing...
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {progress}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* Stall warning */}
      {stalled && (status === "queued" || status === "processing") && (
        <div className="flex items-start gap-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 p-3">
          <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-yellow-500">
              Taking longer than expected
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              ComfyUI hasn&apos;t responded for a while. It may still be working
              (loading a large model, rendering frames), or it could be stuck.
              Check the ComfyUI console for progress.
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 p-3">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="text-destructive break-words">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
