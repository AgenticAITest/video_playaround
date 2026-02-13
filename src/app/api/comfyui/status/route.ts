import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url =
    request.nextUrl.searchParams.get("url") || "http://localhost:8188";

  try {
    const origin = (() => {
      try { return new URL(url).origin; } catch { return url; }
    })();
    const start = Date.now();
    const response = await fetch(`${url}/system_stats`, {
      signal: AbortSignal.timeout(5000),
      headers: { Origin: origin },
    });
    const latency = Date.now() - start;

    if (!response.ok) {
      return NextResponse.json(
        { connected: false, error: `HTTP ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      connected: true,
      latency,
      system: data,
    });
  } catch {
    return NextResponse.json(
      { connected: false, error: "ComfyUI is not reachable" },
      { status: 503 }
    );
  }
}
