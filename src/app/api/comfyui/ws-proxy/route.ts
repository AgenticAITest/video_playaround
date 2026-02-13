import { NextRequest } from "next/server";
import WebSocket from "ws";

export const dynamic = "force-dynamic";

/**
 * SSE proxy: connects to ComfyUI WebSocket server-side (no CORS),
 * then streams progress events to the browser as Server-Sent Events.
 *
 * GET /api/comfyui/ws-proxy?comfyuiUrl=...&clientId=...&promptId=...
 */
export async function GET(request: NextRequest) {
  const comfyuiUrl = request.nextUrl.searchParams.get("comfyuiUrl") || "http://localhost:8188";
  const clientId = request.nextUrl.searchParams.get("clientId") || "";
  const promptId = request.nextUrl.searchParams.get("promptId") || "";

  // Build WebSocket URL
  const wsBase = comfyuiUrl.replace(/^http/, "ws");
  const wsUrl = `${wsBase}/ws${clientId ? `?clientId=${clientId}` : ""}`;

  // Derive origin to match ComfyUI's host check (same fix as HTTP client)
  let origin: string;
  try {
    origin = new URL(comfyuiUrl).origin;
  } catch {
    origin = comfyuiUrl;
  }

  console.log(`[ws-proxy] Connecting to ${wsUrl} for prompt ${promptId}`);

  let ws: WebSocket | null = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        } catch {
          // Stream already closed
        }
      };

      const sendKeepAlive = () => {
        if (closed) return;
        try {
          controller.enqueue(": keepalive\n\n");
        } catch {
          // Stream already closed
        }
      };

      // Keep-alive every 15s to prevent proxy/browser timeout
      const keepAliveInterval = setInterval(sendKeepAlive, 15000);

      try {
        ws = new WebSocket(wsUrl, {
          headers: {
            Origin: origin,
            Host: origin.replace(/^https?:\/\//, ""),
          },
        });
      } catch (err) {
        send("error", { message: "Failed to connect to ComfyUI WebSocket" });
        clearInterval(keepAliveInterval);
        controller.close();
        closed = true;
        return;
      }

      ws.on("open", () => {
        console.log(`[ws-proxy] Connected to ComfyUI WS for prompt ${promptId}`);
        send("connected", { clientId });
      });

      ws.on("message", (raw) => {
        // Binary messages are preview images — skip in SSE (too large)
        if (raw instanceof Buffer || raw instanceof ArrayBuffer) return;

        try {
          const msg = JSON.parse(raw.toString());
          const { type, data } = msg;

          // Filter events by promptId when applicable
          if (promptId && data?.prompt_id && data.prompt_id !== promptId) return;

          switch (type) {
            case "status":
              send("status", data);
              break;
            case "execution_start":
              send("execution_start", data);
              break;
            case "executing":
              send("executing", data);
              break;
            case "progress":
              send("progress", data);
              break;
            case "execution_error":
              send("execution_error", data);
              break;
            case "execution_interrupted":
              send("execution_interrupted", data);
              break;
            case "execution_cached":
              send("execution_cached", data);
              break;
          }

          // If execution is done (executing with node=null), close after a short delay
          if (type === "executing" && data?.node === null && data?.prompt_id === promptId) {
            setTimeout(() => {
              clearInterval(keepAliveInterval);
              if (!closed) {
                closed = true;
                try { controller.close(); } catch {}
              }
              if (ws) { try { ws.close(); } catch {} }
            }, 500);
          }

          // Also close on error/interrupt
          if ((type === "execution_error" || type === "execution_interrupted") &&
              data?.prompt_id === promptId) {
            setTimeout(() => {
              clearInterval(keepAliveInterval);
              if (!closed) {
                closed = true;
                try { controller.close(); } catch {}
              }
              if (ws) { try { ws.close(); } catch {} }
            }, 500);
          }
        } catch {
          // Ignore parse errors
        }
      });

      ws.on("error", (err) => {
        console.log(`[ws-proxy] WS error for prompt ${promptId}:`, err.message);
        send("error", { message: "ComfyUI WebSocket connection error" });
      });

      ws.on("close", (code, reason) => {
        console.log(`[ws-proxy] WS closed for prompt ${promptId}: code=${code} reason=${reason?.toString() || ""}`);

        clearInterval(keepAliveInterval);
        if (!closed) {
          send("disconnected", {});
          closed = true;
          try { controller.close(); } catch {}
        }
      });

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(keepAliveInterval);
        closed = true;
        if (ws) { try { ws.close(); } catch {} }
        try { controller.close(); } catch {}
      });
    },

    cancel() {
      closed = true;
      if (ws) { try { ws.close(); } catch {} }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
