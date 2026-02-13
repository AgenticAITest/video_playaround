"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Server } from "lucide-react";
import { useSettingsStore } from "@/lib/store/settings-store";

type ConnStatus = "checking" | "connected" | "disconnected";

export function DashboardStatus() {
  const settings = useSettingsStore();
  const [comfyStatus, setComfyStatus] = useState<ConnStatus>("checking");
  const [lmStatus, setLmStatus] = useState<ConnStatus>("checking");
  const [comfyLatency, setComfyLatency] = useState<number | null>(null);
  const [lmLatency, setLmLatency] = useState<number | null>(null);

  useEffect(() => {
    const checkComfy = async () => {
      try {
        const res = await fetch(
          `/api/comfyui/status?url=${encodeURIComponent(settings.comfyuiUrl)}`
        );
        const data = await res.json();
        setComfyStatus(data.connected ? "connected" : "disconnected");
        if (data.latency) setComfyLatency(data.latency);
      } catch {
        setComfyStatus("disconnected");
      }
    };

    const checkLm = async () => {
      try {
        const res = await fetch(
          `/api/lmstudio/status?url=${encodeURIComponent(settings.lmStudioUrl)}`
        );
        const data = await res.json();
        setLmStatus(data.connected ? "connected" : "disconnected");
        if (data.latency) setLmLatency(data.latency);
      } catch {
        setLmStatus("disconnected");
      }
    };

    checkComfy();
    checkLm();
  }, [settings.comfyuiUrl, settings.lmStudioUrl]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Card>
        <CardContent className="flex items-center gap-3 pt-4 pb-4">
          <Server className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">ComfyUI</p>
            <p className="text-xs text-muted-foreground truncate">
              {settings.comfyuiUrl}
            </p>
          </div>
          <StatusBadge status={comfyStatus} latency={comfyLatency} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 pt-4 pb-4">
          <Server className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-sm font-medium">LM Studio</p>
            <p className="text-xs text-muted-foreground truncate">
              {settings.lmStudioUrl}
            </p>
          </div>
          <StatusBadge status={lmStatus} latency={lmLatency} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({
  status,
  latency,
}: {
  status: ConnStatus;
  latency: number | null;
}) {
  if (status === "checking") {
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking
      </Badge>
    );
  }

  if (status === "connected") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-green-500/50 text-green-500 text-xs"
      >
        <CheckCircle2 className="h-3 w-3" />
        Online{latency !== null ? ` (${latency}ms)` : ""}
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="gap-1 border-destructive/50 text-destructive text-xs"
    >
      <XCircle className="h-3 w-3" />
      Offline
    </Badge>
  );
}
