import { NextResponse } from "next/server";
import { getTunnelStatus } from "@/lib/ngrok";

export async function GET() {
    return NextResponse.json(getTunnelStatus());
}
