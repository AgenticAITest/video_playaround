import { NextRequest, NextResponse } from "next/server";
import { ComfyUIClient } from "@/lib/comfyui/client";
import {
  isCached,
  readCachedFile,
  writeCachedFile,
  getContentType,
} from "@/lib/cache/file-cache";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const filename = searchParams.get("filename");
  const subfolder = searchParams.get("subfolder") || undefined;
  const type = searchParams.get("type") || undefined;
  const comfyuiUrl = searchParams.get("comfyuiUrl") || "http://localhost:8188";
  const generationId = searchParams.get("generationId") || undefined;

  if (!filename) {
    return NextResponse.json(
      { error: "filename is required" },
      { status: 400 }
    );
  }

  const rangeHeader = request.headers.get("range");

  // If generationId provided and file is cached, serve from disk
  if (generationId && isCached(generationId, filename)) {
    const data = readCachedFile(generationId, filename);
    if (data) {
      return createBufferResponse(data, getContentType(filename), rangeHeader, {
        "X-Cache": "HIT",
      });
    }
  }

  // Try to proxy from ComfyUI
  try {
    const client = new ComfyUIClient(comfyuiUrl);
    const response = await client.viewFile(filename, subfolder, type);

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Lazy-cache: save a local copy if generationId provided
    if (generationId) {
      try {
        writeCachedFile(generationId, filename, buffer);
      } catch {
        // Non-fatal — we still serve the proxied response
      }
    }

    return createBufferResponse(buffer, contentType, rangeHeader, {
      "X-Cache": generationId ? "MISS" : "PROXY",
    });
  } catch (error) {
    // Fallback: if ComfyUI is down but we have a cached copy, serve it
    if (generationId) {
      const data = readCachedFile(generationId, filename);
      if (data) {
        return createBufferResponse(data, getContentType(filename), rangeHeader, {
          "X-Cache": "FALLBACK",
        });
      }
    }

    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Creates a response for a buffer, supporting Range requests for seeking.
 */
function createBufferResponse(
  buffer: Buffer,
  contentType: string,
  rangeHeader: string | null,
  extraHeaders: Record<string, string> = {}
) {
  const totalLength = buffer.length;
  const commonHeaders = {
    ...extraHeaders,
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  if (rangeHeader && rangeHeader.startsWith("bytes=")) {
    try {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalLength - 1;

      if (!isNaN(start) && start < totalLength) {
        const chunkEnd = Math.min(end, totalLength - 1);
        const chunkLength = chunkEnd - start + 1;
        const chunk = buffer.subarray(start, chunkEnd + 1);

        return new NextResponse(new Uint8Array(chunk), {
          status: 206,
          headers: {
            ...commonHeaders,
            "Content-Range": `bytes ${start}-${chunkEnd}/${totalLength}`,
            "Content-Length": chunkLength.toString(),
          },
        });
      }
    } catch (e) {
      console.error("[view-api] Range parse error:", e);
    }
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      ...commonHeaders,
      "Content-Length": totalLength.toString(),
    },
  });
}
