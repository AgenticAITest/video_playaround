import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { comfyuiUrl } = await request.json();
    const baseUrl = (comfyuiUrl || "http://localhost:8188").replace(/\/+$/, "");
    const origin = new URL(baseUrl).origin;

    const response = await fetch(`${baseUrl}/interrupt`, {
      method: "POST",
      headers: { Origin: origin },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `ComfyUI returned ${response.status}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
