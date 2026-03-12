import { NextResponse } from "next/server";
import { getTunnelStatus } from "@/lib/ngrok/manager";

export async function GET() {
    return NextResponse.json(getTunnelStatus());
}
