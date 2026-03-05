"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, Server, Globe } from "lucide-react";
import { useSettingsStore } from "@/lib/store/settings-store";

type ConnStatus = "checking" | "connected" | "disconnected";
type NgrokPhase = "checking" | "active" | "inactive";

export function DashboardStatus() {
  const settings = useSettingsStore();
  const [comfyStatus, setComfyStatus] = useState<ConnStatus>("checking");
  const [orStatus, setOrStatus] = useState<ConnStatus>("checking");
  const [comfyLatency, setComfyLatency] = useState<number | null>(null);
  const [orLatency, setOrLatency] = useState<number | null>(null);
  const [ngrokPhase, setNgrokPhase] = useState<NgrokPhase>("checking");
  const [ngrokUrl, setNgrokUrl] = useState<string | null>(null);

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

    const checkOr = async () => {
      try {
        const res = await fetch(
          `/api/openrouter/status?url=${encodeURIComponent(settings.openRouterApiKey)}`
        );
        const data = await res.json();
        setOrStatus(data.connected ? "connected" : "disconnected");
        if (data.latency) setOrLatency(data.latency);
      } catch {
        setOrStatus("disconnected");
      }
    };

    const checkNgrok = async () => {
      try {
        const res = await fetch("/api/ngrok/status");
        const data = await res.json();

        if (data.active) {
          setNgrokPhase("active");
          setNgrokUrl(data.url ?? null);
        } else if (settings.ngrokAuthToken) {
          const startRes = await fetch("/api/ngrok/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              authToken: settings.ngrokAuthToken,
              domain: settings.ngrokDomain || undefined
            }),
          });
          const startData = await startRes.json();
          if (startData.active) {
            setNgrokPhase("active");
            setNgrokUrl(startData.url);
          } else {
            setNgrokPhase("inactive");
          }
        } else {
          setNgrokPhase("inactive");
        }
      } catch {
        setNgrokPhase("inactive");
      }
    };

    checkComfy();
    checkOr();
    checkNgrok();
  }, [settings.comfyuiUrl, settings.openRouterApiKey, settings.ngrokAuthToken, settings.ngrokDomain]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            <p className="text-sm font-medium">OpenRouter</p>
            <p className="text-xs text-muted-foreground truncate">
              {settings.openRouterApiKey ? "API Key Set" : "API Key Missing"}
            </p>
          </div>
          <StatusBadge status={orStatus} latency={orLatency} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 pt-4 pb-4">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Ngrok Tunnel</p>
            <p className="text-xs text-muted-foreground truncate">
              {ngrokPhase === "active" && ngrokUrl
                ? ngrokUrl
                : settings.ngrokAuthToken
                  ? "Token set — tunnel inactive"
                  : "Not configured"}
            </p>
          </div>
          <NgrokBadge phase={ngrokPhase} />
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

function NgrokBadge({ phase }: { phase: NgrokPhase }) {
  if (phase === "checking") {
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking
      </Badge>
    );
  }

  if (phase === "active") {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-green-500/50 text-green-500 text-xs"
      >
        <CheckCircle2 className="h-3 w-3" />
        Active
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground text-xs">
      <XCircle className="h-3 w-3" />
      Inactive
    </Badge>
  );
}
