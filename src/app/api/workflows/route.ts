import { NextRequest, NextResponse } from "next/server";
import { listWorkflows, createWorkflow } from "@/lib/db/workflows";
import type { WorkflowCategory } from "@/types/workflow";

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get("category") as
      | WorkflowCategory
      | null;
    const workflows = listWorkflows(category || undefined);
    return NextResponse.json(workflows);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, category, apiJson, inputMappings, outputNodeId } =
      body;

    if (!name || !category || !apiJson || !inputMappings) {
      return NextResponse.json(
        {
          error:
            "name, category, apiJson, and inputMappings are required",
        },
        { status: 400 }
      );
    }

    const workflow = createWorkflow({
      name,
      description: description || "",
      category,
      apiJson,
      inputMappings,
      outputNodeId: outputNodeId || "",
    });

    return NextResponse.json(workflow, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
