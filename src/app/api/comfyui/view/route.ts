import { NextRequest, NextResponse } from "next/server";
import { ComfyUIClient } from "@/lib/comfyui/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const filename = searchParams.get("filename");
    const subfolder = searchParams.get("subfolder") || undefined;
    const type = searchParams.get("type") || undefined;
    const comfyuiUrl = searchParams.get("comfyuiUrl") || "http://localhost:8188";

    if (!filename) {
      return NextResponse.json(
        { error: "filename is required" },
        { status: 400 }
      );
    }

    const client = new ComfyUIClient(comfyuiUrl);
    const response = await client.viewFile(filename, subfolder, type);

    // Stream the binary response through
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";

    return new NextResponse(response.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
