import { NextRequest, NextResponse } from "next/server";
import { ComfyUIClient } from "@/lib/comfyui/client";
import type { OutputFile } from "@/types/generation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ promptId: string }> }
) {
  try {
    const { promptId } = await params;
    const comfyuiUrl =
      request.nextUrl.searchParams.get("comfyuiUrl") ||
      "http://localhost:8188";

    const client = new ComfyUIClient(comfyuiUrl);
    const history = await client.getHistory(promptId);

    if (!history) {
      return NextResponse.json({ completed: false, outputs: [] });
    }

    // Debug: log the raw history structure to diagnose completion detection issues
    console.log(`[history/${promptId}] status:`, JSON.stringify(history.status));
    console.log(`[history/${promptId}] output keys:`, Object.keys(history.outputs || {}));
    for (const [nodeId, nodeOut] of Object.entries(history.outputs || {})) {
      console.log(`[history/${promptId}] node ${nodeId} output keys:`, Object.keys(nodeOut));
    }

    const statusStr = history.status?.status_str || "unknown";
    const completedFlag = history.status?.completed ?? false;

    // If ComfyUI reports an error status, surface it
    if (statusStr === "error") {
      let errorDetail = "ComfyUI reported an error for this generation";

      // ComfyUI stores error details in status.messages (array of [type, data] tuples)
      const statusObj = history.status as unknown as Record<string, unknown>;
      const messages = (statusObj?.messages ?? statusObj?.status_messages) as
        | Array<[string, Record<string, unknown>]>
        | undefined;

      if (messages) {
        for (const [msgType, msgData] of messages) {
          if (msgType === "execution_error" && msgData) {
            const excMsg = msgData.exception_message as string | undefined;
            const nodeType = msgData.node_type as string | undefined;
            const nodeId = msgData.node_id as string | undefined;
            if (excMsg) {
              const nodePart = nodeType
                ? ` in "${nodeType}" (node ${nodeId})`
                : nodeId
                  ? ` in node ${nodeId}`
                  : "";
              errorDetail = `${excMsg}${nodePart}`;
            }
            break;
          }
        }
      }

      return NextResponse.json({
        completed: false,
        status: "error",
        error: errorDetail,
        outputs: [],
      });
    }

    const outputFiles: OutputFile[] = [];
    // Track filenames to avoid duplicates (some nodes output same file under multiple keys)
    const seenFiles = new Set<string>();

    // Determine media type from file extension
    function getMediaType(filename: string, outputKey: string): "image" | "video" {
      const ext = filename.split(".").pop()?.toLowerCase() || "";
      // Actual video container formats → use <video> tag
      if (["mp4", "webm", "avi", "mov", "mkv"].includes(ext)) return "video";
      // gifs/videos output key with non-image extensions
      if (outputKey === "videos" || outputKey === "gifs") {
        if (["mp4", "webm", "avi", "mov", "mkv"].includes(ext)) return "video";
      }
      // Everything else (webp, gif, png, jpg, apng) → use <img> tag
      // Animated WEBP/GIF/APNG are displayed natively by browsers in <img>
      return "image";
    }

    // Extract output files from all output nodes
    for (const [nodeId, nodeOutput] of Object.entries(history.outputs)) {
      const out = nodeOutput as Record<string, unknown>;

      // Check all known output keys that contain file arrays
      for (const key of ["images", "gifs", "videos"]) {
        const items = out[key] as Array<{ filename: string; subfolder?: string; type?: string }> | undefined;
        if (!items?.length) continue;

        for (const item of items) {
          if (!item.filename || seenFiles.has(item.filename)) continue;
          seenFiles.add(item.filename);

          outputFiles.push({
            filename: item.filename,
            subfolder: item.subfolder || "",
            type: (item.type as "output" | "temp") || "output",
            mediaType: getMediaType(item.filename, key),
          });
        }
      }

      // Fallback: check for any other array-of-file-objects keys we might have missed
      // (skip "animated" — it's a boolean metadata field from SaveAnimatedWEBP, not file data)
      for (const [key, val] of Object.entries(out)) {
        if (["images", "gifs", "videos", "animated"].includes(key)) continue;
        if (Array.isArray(val) && val.length > 0 && val[0]?.filename) {
          console.log(`[history/${promptId}] node ${nodeId} unexpected output key "${key}":`, val);
          for (const item of val as Array<{ filename: string; subfolder?: string; type?: string }>) {
            if (!item.filename || seenFiles.has(item.filename)) continue;
            seenFiles.add(item.filename);
            outputFiles.push({
              filename: item.filename,
              subfolder: item.subfolder || "",
              type: (item.type as "output" | "temp") || "output",
              mediaType: getMediaType(item.filename, key),
            });
          }
        }
      }
    }

    // Consider completed if: explicit completed flag OR status is "success" OR we have outputs
    const completed = completedFlag || statusStr === "success" || outputFiles.length > 0;

    console.log(`[history/${promptId}] completed=${completed} (flag=${completedFlag}, status=${statusStr}, outputs=${outputFiles.length})`);

    return NextResponse.json({
      completed,
      outputs: outputFiles,
      status: statusStr,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
