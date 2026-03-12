"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, CircleMinus, ExternalLink } from "lucide-react";

interface NgrokStatusProps {
    authToken: string;
    domain: string;
}

interface TunnelStatus {
    active: boolean;
    url: string | null;
    error: string | null;
}

type Phase = "idle" | "connecting" | "connected" | "error" | "stopped";

export function NgrokStatus({ authToken, domain }: NgrokStatusProps) {
    const [phase, setPhase] = useState<Phase>("idle");
    const [url, setUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const prevAuthRef = useRef<string>("");
    const prevDomainRef = useRef<string>("");

    const applyStatus = useCallback((s: TunnelStatus) => {
        if (s.active) {
            setPhase("connected");
            setUrl(s.url);
            setError(null);
        } else if (s.error) {
            setPhase("error");
            setError(s.error);
            setUrl(null);
        } else {
            setPhase("stopped");
            setUrl(null);
            setError(null);
        }
    }, []);

    const startPolling = useCallback(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch("/api/ngrok/status");
                const data: TunnelStatus = await res.json();
                applyStatus(data);
            } catch {
                // ignore transient poll errors
            }
        }, 5000);
    }, [applyStatus]);

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    // Start / restart tunnel when authToken or domain changes
    useEffect(() => {
        const prevAuth = prevAuthRef.current;
        const prevDomain = prevDomainRef.current;
        prevAuthRef.current = authToken;
        prevDomainRef.current = domain;

        // No change — skip on initial render too if both are empty
        if (authToken === prevAuth && domain === prevDomain) return;

        if (!authToken) {
            // Auth token cleared — stop the tunnel
            setPhase("stopped");
            stopPolling();
            fetch("/api/ngrok/stop", { method: "POST" }).catch(() => { });
            return;
        }

        // Start / restart
        setPhase("connecting");
        setError(null);
        setUrl(null);

        fetch("/api/ngrok/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ authToken, domain: domain || undefined }),
        })
            .then((r) => r.json())
            .then((data: TunnelStatus) => {
                applyStatus(data);
                startPolling();
            })
            .catch((err) => {
                setPhase("error");
                setError(err?.message ?? "Failed to reach server");
            });
    }, [authToken, domain, applyStatus, startPolling, stopPolling]);

    // Fetch initial status on mount
    useEffect(() => {
        fetch("/api/ngrok/status")
            .then((r) => r.json())
            .then((data: TunnelStatus) => {
                applyStatus(data);
                if (data.active) startPolling();
            })
            .catch(() => { });

        return () => stopPolling();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleStop = async () => {
        stopPolling();
        setPhase("stopped");
        setUrl(null);
        setError(null);
        await fetch("/api/ngrok/stop", { method: "POST" });
    };

    return (
        <div className="flex flex-wrap items-center gap-3">
            {phase === "idle" && (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <CircleMinus className="h-3 w-3" />
                    Not configured
                </Badge>
            )}

            {phase === "connecting" && (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Connecting…
                </Badge>
            )}

            {phase === "connected" && (
                <>
                    <Badge
                        variant="outline"
                        className="gap-1 border-green-500/50 text-green-500"
                    >
                        <CheckCircle2 className="h-3 w-3" />
                        Connected
                    </Badge>
                    {url && (
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
                        >
                            {url}
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                    <Button variant="outline" size="sm" onClick={handleStop}>
                        Stop Tunnel
                    </Button>
                </>
            )}

            {phase === "error" && (
                <Badge
                    variant="outline"
                    className="gap-1 border-destructive/50 text-destructive"
                >
                    <XCircle className="h-3 w-3" />
                    {error}
                </Badge>
            )}

            {phase === "stopped" && (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                    <CircleMinus className="h-3 w-3" />
                    Stopped
                </Badge>
            )}
        </div>
    );
}
