import { NextRequest, NextResponse } from "next/server";
import { startTunnel } from "@/lib/ngrok/manager";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { authToken, domain } = body as { authToken?: string; domain?: string };

        if (!authToken) {
            return NextResponse.json(
                { active: false, error: "Auth token is required" },
                { status: 400 }
            );
        }

        const url = await startTunnel(authToken, domain);

        return NextResponse.json({
            active: true,
            url,
            error: null,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to start tunnel";
        return NextResponse.json(
            { active: false, error: message },
            { status: 500 }
        );
    }
}
