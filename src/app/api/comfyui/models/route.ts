import { NextRequest, NextResponse } from "next/server";
import { ComfyUIClient } from "@/lib/comfyui/client";

export async function GET(request: NextRequest) {
  try {
    const comfyuiUrl =
      request.nextUrl.searchParams.get("comfyuiUrl") ||
      "http://localhost:8188";

    const client = new ComfyUIClient(comfyuiUrl);
    const objectInfo = await client.getObjectInfo();

    return NextResponse.json(objectInfo);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
