"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface ConnectionStatusProps {
  label: string;
  url: string;
  endpoint: string; // "/api/comfyui/status" or "/api/lmstudio/status"
}

type Status = "idle" | "testing" | "connected" | "error";

export function ConnectionStatus({
  label,
  url,
  endpoint,
}: ConnectionStatusProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [latency, setLatency] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function testConnection() {
    setStatus("testing");
    setError(null);
    setLatency(null);

    try {
      const res = await fetch(
        `${endpoint}?url=${encodeURIComponent(url)}`
      );
      const data = await res.json();

      if (data.connected) {
        setStatus("connected");
        setLatency(data.latency);
      } else {
        setStatus("error");
        setError(data.error || "Connection failed");
      }
    } catch {
      setStatus("error");
      setError("Failed to reach test endpoint");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="sm" onClick={testConnection} disabled={status === "testing"}>
        {status === "testing" && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
        Test {label}
      </Button>

      {status === "connected" && (
        <Badge variant="outline" className="gap-1 border-green-500/50 text-green-500">
          <CheckCircle2 className="h-3 w-3" />
          Connected{latency !== null && ` (${latency}ms)`}
        </Badge>
      )}

      {status === "error" && (
        <Badge variant="outline" className="gap-1 border-destructive/50 text-destructive">
          <XCircle className="h-3 w-3" />
          {error}
        </Badge>
      )}
    </div>
  );
}
