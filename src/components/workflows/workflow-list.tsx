"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, Image, Film, PlayCircle } from "lucide-react";
import type { WorkflowConfig } from "@/types/workflow";
import { formatDate } from "@/lib/utils";

const categoryIcons = {
  "text-to-image": Image,
  "text-to-video": Film,
  "image-to-video": PlayCircle,
};

const categoryLabels = {
  "text-to-image": "Text to Image",
  "text-to-video": "Text to Video",
  "image-to-video": "Image to Video",
};

export function WorkflowList() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchWorkflows = async () => {
    try {
      const res = await fetch("/api/workflows");
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data);
      }
    } catch {
      toast.error("Failed to load workflows");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/workflows/${deleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setWorkflows(workflows.filter((w) => w.id !== deleteId));
        toast.success("Workflow deleted");
      } else {
        toast.error("Failed to delete workflow");
      }
    } catch {
      toast.error("Failed to delete workflow");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">No workflows yet</p>
          <p className="text-sm text-muted-foreground">
            Upload a ComfyUI workflow JSON to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {workflows.map((workflow) => {
          const Icon = categoryIcons[workflow.category];
          return (
            <Card
              key={workflow.id}
              className="cursor-pointer transition-colors hover:bg-accent/30"
              onClick={() => router.push(`/workflows/${workflow.id}`)}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <Icon className="h-8 w-8 shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{workflow.name}</h3>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {categoryLabels[workflow.category]}
                    </Badge>
                    <Badge variant="outline" className="shrink-0 text-xs">
                      {workflow.inputMappings.length} mappings
                    </Badge>
                  </div>
                  {workflow.description && (
                    <p className="mt-1 text-sm text-muted-foreground truncate">
                      {workflow.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updated {formatDate(workflow.updatedAt)}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/workflows/${workflow.id}`);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(workflow.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workflow</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this workflow? This cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
