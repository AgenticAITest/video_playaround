"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { usePromptEnhance } from "./use-prompt-enhance";
import { useSettingsStore } from "@/lib/store/settings-store";
import type {
  GenerationMode,
  GenerationStatus,
  GenerationParams,
  OutputFile,
} from "@/types/generation";
import { toast } from "sonner";

/** How long (ms) without any activity before we warn the user (mode-aware) */
const STALL_THRESHOLD_IMAGE_MS = 5 * 60_000; // 5 minutes for images
const STALL_THRESHOLD_VIDEO_MS = 15 * 60_000; // 15 minutes for video
/** How often (ms) to poll history as a fallback */
const POLL_INTERVAL_MS = 3_000;

interface UseGenerationResult {
  // State
  status: GenerationStatus;
  progress: number;
  progressMax: number;
  progressValue: number;
  currentNode: string | null;
  previewBlob: Blob | null;
  enhancedPrompt: string | null;
  outputFiles: OutputFile[];
  generationId: string | null;
  error: string | null;
  enhancing: boolean;
  queueRemaining: number;
  elapsedMs: number;
  stalled: boolean;

  // Actions
  generate: (opts: {
    workflowId: string;
    prompt: string;
    negativePrompt?: string;
    params: GenerationParams;
    inputImageFilename?: string;
  }) => Promise<void>;
  enhancePrompt: (prompt: string) => Promise<string | null>;
  cancel: () => Promise<void>;
  reset: () => void;
}

export function useGeneration(mode: GenerationMode): UseGenerationResult {
  const settings = useSettingsStore();
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [promptId, setPromptId] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [enhancedPrompt, setEnhancedPrompt] = useState<string | null>(null);
  const [outputFiles, setOutputFiles] = useState<OutputFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [stalled, setStalled] = useState(false);

  // SSE progress state
  const [progress, setProgress] = useState(0);
  const [progressMax, setProgressMax] = useState(0);
  const [progressValue, setProgressValue] = useState(0);
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [queueRemaining, setQueueRemaining] = useState(0);

  const { enhance, enhancing, error: enhanceError } = usePromptEnhance();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  // Guard so we don't process results twice (SSE + poll race)
  const completedRef = useRef(false);
  // Track last activity for stall detection
  const lastActivityRef = useRef<number | null>(null);

  const isActive =
    status === "queued" || status === "processing" || status === "enhancing";

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const closeSse = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
  }, []);

  // Helper: handle successful completion
  const handleCompleted = useCallback(
    (outputs: OutputFile[]) => {
      if (completedRef.current) return;
      completedRef.current = true;
      setOutputFiles(outputs);
      setStatus("completed");
      setProgress(100);
      clearPoll();
      closeSse();

      if (generationId) {
        fetch(`/api/generations/${generationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "completed",
            outputFiles: outputs,
            completedAt: new Date().toISOString(),
            comfyuiUrl: settings.comfyuiUrl,
          }),
        });
      }
    },
    [generationId, settings.comfyuiUrl, clearPoll, closeSse]
  );

  // Helper: handle error
  const handleError = useCallback(
    (errMsg: string) => {
      if (completedRef.current) return;
      completedRef.current = true;
      setError(errMsg);
      setStatus("error");
      clearPoll();
      closeSse();
      toast.error(errMsg);

      if (generationId) {
        fetch(`/api/generations/${generationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "error",
            error: errMsg,
            completedAt: new Date().toISOString(),
          }),
        });
      }
    },
    [generationId, clearPoll, closeSse]
  );

  // Elapsed-time ticker + stall detection
  const stallThreshold = (mode === "text-to-image" || mode === "image-to-image")
    ? STALL_THRESHOLD_IMAGE_MS
    : STALL_THRESHOLD_VIDEO_MS;

  useEffect(() => {
    if (isActive && startedAt) {
      timerRef.current = setInterval(() => {
        const now = Date.now();
        setElapsedMs(now - startedAt);

        const lastActivity = Math.max(
          lastActivityRef.current || 0,
          startedAt
        );
        const silentMs = now - lastActivity;
        setStalled(silentMs > stallThreshold);
      }, 1000);
    } else {
      if (startedAt && !isActive) {
        setElapsedMs(Date.now() - startedAt);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive, startedAt, stallThreshold]);

  // Start SSE connection for a given promptId — called directly from generate()
  const startSse = useCallback((newPromptId: string) => {
    closeSse();

    const params = new URLSearchParams({
      comfyuiUrl: settings.comfyuiUrl,
      clientId: `proxy-${Date.now()}`,
      promptId: newPromptId,
    });

    const es = new EventSource(`/api/comfyui/ws-proxy?${params}`);
    sseRef.current = es;

    es.addEventListener("connected", () => {
      lastActivityRef.current = Date.now();
    });

    es.addEventListener("execution_start", (e) => {
      const data = JSON.parse(e.data);
      if (data.prompt_id === newPromptId) {
        lastActivityRef.current = Date.now();
        setStatus("processing");
        setProgress(0);
        setCurrentNode(null);
      }
    });

    es.addEventListener("executing", (e) => {
      const data = JSON.parse(e.data);
      if (data.prompt_id === newPromptId) {
        lastActivityRef.current = Date.now();
        if (data.node === null) {
          // Execution done — fetch outputs via history
          closeSse();
          fetchHistoryOnce(newPromptId);
        } else {
          setCurrentNode(data.node || null);
          setStatus("processing");
        }
      }
    });

    es.addEventListener("progress", (e) => {
      const data = JSON.parse(e.data);
      if (data.prompt_id === newPromptId && data.max) {
        lastActivityRef.current = Date.now();
        const pct = Math.round(((data.value || 0) / data.max) * 100);
        setProgress(pct);
        setProgressValue(data.value || 0);
        setProgressMax(data.max);
        setStatus("processing");
      }
    });

    es.addEventListener("status", (e) => {
      const data = JSON.parse(e.data);
      const remaining = data?.status?.exec_info?.queue_remaining ?? 0;
      setQueueRemaining(remaining);
      lastActivityRef.current = Date.now();
    });

    es.addEventListener("execution_error", (e) => {
      const data = JSON.parse(e.data);
      if (data.prompt_id === newPromptId) {
        const nodePart = data.node_type
          ? ` in "${data.node_type}" (node ${data.node_id})`
          : data.node_id
            ? ` in node ${data.node_id}`
            : "";
        const msg = data.exception_message
          ? `ComfyUI error${nodePart}: ${data.exception_message}`
          : `ComfyUI execution failed${nodePart}`;
        handleError(msg);
      }
    });

    es.addEventListener("execution_interrupted", (e) => {
      const data = JSON.parse(e.data);
      if (data.prompt_id === newPromptId) {
        handleError("Generation was interrupted on the ComfyUI server");
      }
    });

    es.addEventListener("error", () => {
      // SSE connection dropped — polling fallback handles completion
    });
  }, [settings.comfyuiUrl, closeSse, handleError]);

  // Fetch history once (called by SSE when execution completes)
  const fetchHistoryOnce = useCallback(async (pid: string) => {
    if (completedRef.current) return;
    try {
      const res = await fetch(
        `/api/comfyui/history/${pid}?comfyuiUrl=${encodeURIComponent(settings.comfyuiUrl)}`
      );
      const data = await res.json();
      if (data.status === "error") {
        handleError(data.error || "ComfyUI reported an error");
      } else if (data.completed) {
        handleCompleted(data.outputs || []);
      }
    } catch {
      // Polling fallback will catch it
    }
  }, [settings.comfyuiUrl, handleCompleted, handleError]);

  // Clean up SSE on unmount
  useEffect(() => {
    return () => { closeSse(); };
  }, [closeSse]);

  // POLLING FALLBACK: ensures completion is detected even if SSE drops
  useEffect(() => {
    if (!promptId || completedRef.current) return;
    if (status !== "queued" && status !== "processing") return;

    const startDelay = setTimeout(() => {
      if (completedRef.current) return;

      const poll = async () => {
        if (completedRef.current) return;
        try {
          const res = await fetch(
            `/api/comfyui/history/${promptId}?comfyuiUrl=${encodeURIComponent(settings.comfyuiUrl)}`
          );
          const data = await res.json();

          if (res.ok) {
            lastActivityRef.current = Date.now();
          }

          if (data.status === "error") {
            handleError(data.error || "ComfyUI reported an error");
            return;
          }
          if (data.completed) {
            handleCompleted(data.outputs || []);
            return;
          }
          if (data.status && status === "queued") {
            setStatus("processing");
          }
        } catch {
          // Network blip — keep polling
        }
      };

      poll();
      pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    }, 3000);

    return () => {
      clearTimeout(startDelay);
      clearPoll();
    };
  }, [promptId, status, settings.comfyuiUrl, handleCompleted, handleError, clearPoll]);

  const enhancePrompt = useCallback(
    async (prompt: string) => {
      setStatus("enhancing");
      setStartedAt(Date.now());
      const result = await enhance(
        prompt,
        mode,
        settings.lmStudioUrl,
        settings.lmStudioModel || undefined
      );
      if (result) {
        setEnhancedPrompt(result);
      }
      setStatus("idle");
      setStartedAt(null);
      setElapsedMs(0);
      return result;
    },
    [enhance, mode, settings.lmStudioUrl, settings.lmStudioModel]
  );

  const generate = useCallback(
    async (opts: {
      workflowId: string;
      prompt: string;
      negativePrompt?: string;
      params: GenerationParams;
      inputImageFilename?: string;
    }) => {
      completedRef.current = false;
      lastActivityRef.current = null;
      setStatus("queued");
      setOutputFiles([]);
      setError(null);
      setStalled(false);
      setStartedAt(Date.now());
      setElapsedMs(0);
      setProgress(0);
      setProgressMax(0);
      setProgressValue(0);
      setCurrentNode(null);
      setQueueRemaining(0);

      try {
        const res = await fetch("/api/comfyui/prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workflowId: opts.workflowId,
            mode,
            prompt: opts.prompt,
            negativePrompt: opts.negativePrompt,
            enhancedPrompt: enhancedPrompt,
            params: opts.params,
            inputImageFilename: opts.inputImageFilename,
            comfyuiUrl: settings.comfyuiUrl,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to queue generation");
        }

        setPromptId(data.promptId);
        setGenerationId(data.generationId);
        startSse(data.promptId);
        toast.success("Generation queued");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Generation failed";
        setError(message);
        setStatus("error");
        toast.error(message);
      }
    },
    [mode, enhancedPrompt, settings.comfyuiUrl, startSse]
  );

  const cancel = useCallback(async () => {
    try {
      await fetch("/api/comfyui/interrupt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comfyuiUrl: settings.comfyuiUrl }),
      });
    } catch {
      // Interrupt request failed, but we still want to reset the UI
    }

    completedRef.current = true;
    clearPoll();
    closeSse();
    setStatus("idle");
    setPromptId(null);
    setError(null);
    setStartedAt(null);
    setElapsedMs(0);
    setStalled(false);
    setProgress(0);
    setProgressMax(0);
    setProgressValue(0);
    setCurrentNode(null);
    toast.info("Generation cancelled");
  }, [settings.comfyuiUrl, clearPoll, closeSse]);

  const reset = useCallback(() => {
    completedRef.current = false;
    setStatus("idle");
    setPromptId(null);
    setGenerationId(null);
    setEnhancedPrompt(null);
    setOutputFiles([]);
    setError(null);
    setStartedAt(null);
    setElapsedMs(0);
    setStalled(false);
    setProgress(0);
    setProgressMax(0);
    setProgressValue(0);
    setCurrentNode(null);
    clearPoll();
    closeSse();
  }, [clearPoll, closeSse]);

  return {
    status,
    progress,
    progressMax,
    progressValue,
    currentNode,
    previewBlob: null, // SSE doesn't stream binary previews
    enhancedPrompt,
    outputFiles,
    generationId,
    error: error || enhanceError,
    enhancing,
    queueRemaining,
    elapsedMs,
    stalled,
    generate,
    enhancePrompt,
    cancel,
    reset,
  };
}
