"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { WorkflowUpload } from "@/components/workflows/workflow-upload";

export default function WorkflowsPage() {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Workflows</h2>
          <p className="text-muted-foreground">
            Upload and manage your ComfyUI workflows
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Upload Workflow
        </Button>
      </div>

      <WorkflowList />
      <WorkflowUpload open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  );
}
