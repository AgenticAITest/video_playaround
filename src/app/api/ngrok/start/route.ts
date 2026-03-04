import { NextRequest, NextResponse } from "next/server";
import { startTunnel } from "@/lib/ngrok";

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { authToken, domain } = body as {
        authToken?: string;
        domain?: string;
    };

    if (!authToken) {
        return NextResponse.json(
            { error: "authToken is required" },
            { status: 400 }
        );
    }

    const status = await startTunnel(authToken, domain || undefined);
    return NextResponse.json(status);
}
