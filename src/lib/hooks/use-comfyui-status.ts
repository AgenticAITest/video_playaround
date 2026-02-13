"use client";

import { useState, useEffect } from "react";
import { useSettingsStore } from "@/lib/store/settings-store";

type ConnStatus = "checking" | "connected" | "disconnected";

export function useComfyuiStatus(pollIntervalMs = 30_000) {
  const comfyuiUrl = useSettingsStore((s) => s.comfyuiUrl);
  const [status, setStatus] = useState<ConnStatus>("checking");
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(
          `/api/comfyui/status?url=${encodeURIComponent(comfyuiUrl)}`
        );
        const data = await res.json();
        if (cancelled) return;
        setStatus(data.connected ? "connected" : "disconnected");
        setLatency(data.latency ?? null);
      } catch {
        if (!cancelled) setStatus("disconnected");
      }
    };

    check();
    const id = setInterval(check, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [comfyuiUrl, pollIntervalMs]);

  return { status, latency };
}
