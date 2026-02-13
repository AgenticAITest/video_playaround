import { notFound } from "next/navigation";
import { getWorkflow } from "@/lib/db/workflows";
import { WorkflowEditor } from "@/components/workflows/workflow-editor";

export default async function WorkflowEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workflow = getWorkflow(id);

  if (!workflow) {
    notFound();
  }

  return <WorkflowEditor workflow={workflow} />;
}
