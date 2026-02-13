"use client";

import { useState, useEffect, useCallback } from "react";
import { getComfyUIWebSocket } from "@/lib/comfyui/websocket";

export interface ComfyUIWSState {
  connected: boolean;
  progress: number; // 0-100
  currentNode: string | null;
  previewBlob: Blob | null;
  executionStarted: boolean;
  executionDone: boolean;
  executionError: string | null;
  queueRemaining: number;
  lastEventAt: number | null; // timestamp of last WS event during generation
}

export function useComfyuiWs(
  serverUrl: string,
  promptId: string | null
) {
  const [state, setState] = useState<ComfyUIWSState>({
    connected: false,
    progress: 0,
    currentNode: null,
    previewBlob: null,
    executionStarted: false,
    executionDone: false,
    executionError: null,
    queueRemaining: 0,
    lastEventAt: null,
  });

  const [clientId, setClientId] = useState<string>("");

  const resetState = useCallback(() => {
    setState({
      connected: false,
      progress: 0,
      currentNode: null,
      previewBlob: null,
      executionStarted: false,
      executionDone: false,
      executionError: null,
      queueRemaining: 0,
      lastEventAt: null,
    });
  }, []);

  useEffect(() => {
    // Skip empty URL (during SSR or before client mount)
    if (!serverUrl) return;

    const ws = getComfyUIWebSocket(serverUrl);
    setClientId(ws.getClientId());

    // Reset reconnect attempts in case a previous URL exhausted them
    ws.resetReconnect();

    const unsubs: (() => void)[] = [];

    // Subscribe to events BEFORE connecting so we never miss a fast "connected" event
    unsubs.push(
      ws.on("connected", () => {
        setState((s) => ({ ...s, connected: true }));
      })
    );

    unsubs.push(
      ws.on("disconnected", () => {
        setState((s) => ({ ...s, connected: false }));
      })
    );

    // Now connect (or re-use existing connection)
    ws.connect();

    // If already connected (singleton was reused), sync state immediately
    if (ws.isConnected()) {
      setState((s) => ({ ...s, connected: true }));
    }

    // Queue status updates (sent on every queue change)
    unsubs.push(
      ws.on("status", (data: unknown) => {
        const d = data as { status?: { exec_info?: { queue_remaining?: number } } };
        const remaining = d?.status?.exec_info?.queue_remaining ?? 0;
        setState((s) => ({ ...s, queueRemaining: remaining }));
      })
    );

    unsubs.push(
      ws.on("execution_start", (data: unknown) => {
        const d = data as { prompt_id?: string };
        if (promptId && d.prompt_id === promptId) {
          setState((s) => ({
            ...s,
            executionStarted: true,
            executionDone: false,
            executionError: null,
            progress: 0,
            currentNode: null,
            lastEventAt: Date.now(),
          }));
        }
      })
    );

    unsubs.push(
      ws.on("executing", (data: unknown) => {
        const d = data as { node?: string | null; prompt_id?: string };
        if (promptId && d.prompt_id === promptId) {
          if (d.node === null) {
            setState((s) => ({
              ...s,
              executionDone: true,
              currentNode: null,
              progress: 100,
              lastEventAt: Date.now(),
            }));
          } else {
            setState((s) => ({
              ...s,
              currentNode: d.node || null,
              lastEventAt: Date.now(),
            }));
          }
        }
      })
    );

    unsubs.push(
      ws.on("progress", (data: unknown) => {
        const d = data as { value?: number; max?: number; prompt_id?: string };
        if (promptId && d.prompt_id === promptId && d.max) {
          const pct = Math.round(((d.value || 0) / d.max) * 100);
          setState((s) => ({ ...s, progress: pct, lastEventAt: Date.now() }));
        }
      })
    );

    unsubs.push(
      ws.on("preview", (data: unknown) => {
        if (data instanceof Blob) {
          setState((s) => ({ ...s, previewBlob: data, lastEventAt: Date.now() }));
        }
      })
    );

    // Handle execution errors from ComfyUI
    unsubs.push(
      ws.on("execution_error", (data: unknown) => {
        const d = data as {
          prompt_id?: string;
          node_id?: string;
          node_type?: string;
          exception_message?: string;
          exception_type?: string;
          traceback?: string[];
        };
        if (promptId && d.prompt_id === promptId) {
          const nodePart = d.node_type
            ? ` in node "${d.node_type}" (${d.node_id})`
            : d.node_id
              ? ` in node ${d.node_id}`
              : "";
          const msg = d.exception_message
            ? `ComfyUI error${nodePart}: ${d.exception_message}`
            : `ComfyUI execution failed${nodePart}`;
          setState((s) => ({
            ...s,
            executionDone: true,
            executionError: msg,
            lastEventAt: Date.now(),
          }));
        }
      })
    );

    // Handle execution_interrupted (user cancelled in ComfyUI)
    unsubs.push(
      ws.on("execution_interrupted", (data: unknown) => {
        const d = data as { prompt_id?: string };
        if (promptId && d.prompt_id === promptId) {
          setState((s) => ({
            ...s,
            executionDone: true,
            executionError: "Generation was interrupted on the ComfyUI server",
            lastEventAt: Date.now(),
          }));
        }
      })
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [serverUrl, promptId]);

  return { ...state, clientId, resetState };
}
