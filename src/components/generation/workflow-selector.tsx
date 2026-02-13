"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkflowConfig, WorkflowCategory } from "@/types/workflow";

interface WorkflowSelectorProps {
  category: WorkflowCategory;
  selectedId: string | null;
  onSelect: (workflow: WorkflowConfig) => void;
}

export function WorkflowSelector({
  category,
  selectedId,
  onSelect,
}: WorkflowSelectorProps) {
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/workflows?category=${category}`)
      .then((res) => res.json())
      .then((data) => {
        setWorkflows(Array.isArray(data) ? data : []);
        // Auto-select first if nothing selected
        if (!selectedId && data.length > 0) {
          onSelect(data[0]);
        }
      })
      .catch(() => setWorkflows([]))
      .finally(() => setLoading(false));
  }, [category]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Workflow</Label>
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Workflow</Label>
        <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          No workflows found for this mode.{" "}
          <a href="/workflows" className="text-primary underline">
            Upload one
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Workflow</Label>
      <Select
        value={selectedId || undefined}
        onValueChange={(id) => {
          const wf = workflows.find((w) => w.id === id);
          if (wf) onSelect(wf);
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select a workflow" />
        </SelectTrigger>
        <SelectContent>
          {workflows.map((wf) => (
            <SelectItem key={wf.id} value={wf.id}>
              <div className="flex items-center gap-2">
                <span>{wf.name}</span>
                <Badge variant="outline" className="text-[10px]">
                  {wf.inputMappings.length} inputs
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {workflows.find((w) => w.id === selectedId)?.description && (
        <p className="text-xs text-muted-foreground">
          {workflows.find((w) => w.id === selectedId)!.description}
        </p>
      )}
    </div>
  );
}
