"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, FileJson, AlertCircle } from "lucide-react";
import { validateApiFormat, autoDetectMappings, detectOutputNode } from "@/lib/comfyui/workflow-utils";
import type { WorkflowCategory } from "@/types/workflow";

interface WorkflowUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WorkflowUpload({ open, onOpenChange }: WorkflowUploadProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<WorkflowCategory>("text-to-image");
  const [jsonContent, setJsonContent] = useState<Record<string, unknown> | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = useCallback(() => {
    setName("");
    setDescription("");
    setCategory("text-to-image");
    setJsonContent(null);
    setFileName(null);
    setValidationError(null);
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".json")) {
        setValidationError("Please upload a .json file");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          const error = validateApiFormat(parsed);
          if (error) {
            setValidationError(error);
            setJsonContent(null);
            return;
          }
          setJsonContent(parsed);
          setFileName(file.name);
          setValidationError(null);

          // Auto-fill name from filename if empty
          if (!name) {
            setName(file.name.replace(/\.json$/, "").replace(/[_-]/g, " "));
          }
        } catch {
          setValidationError("Invalid JSON file");
          setJsonContent(null);
        }
      };
      reader.readAsText(file);
    },
    [name]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleSave = async () => {
    if (!name.trim() || !jsonContent) return;

    setSaving(true);
    try {
      const mappings = autoDetectMappings(jsonContent);
      const outputNodeId = detectOutputNode(jsonContent) || "";

      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category,
          apiJson: jsonContent,
          inputMappings: mappings,
          outputNodeId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save workflow");
      }

      const workflow = await res.json();
      toast.success("Workflow uploaded successfully");
      resetForm();
      onOpenChange(false);
      router.push(`/workflows/${workflow.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save workflow"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetForm();
        onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Workflow</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="wf-name">Name</Label>
            <Input
              id="wf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My SDXL Workflow"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="wf-desc">Description (optional)</Label>
            <Textarea
              id="wf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this workflow does..."
              rows={2}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(val) => setCategory(val as WorkflowCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text-to-image">Text to Image</SelectItem>
                <SelectItem value="text-to-video">Text to Video</SelectItem>
                <SelectItem value="image-to-video">Image to Video</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* File Drop Zone */}
          <div className="space-y-2">
            <Label>Workflow JSON (API Format)</Label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50"
            >
              {jsonContent ? (
                <>
                  <FileJson className="h-8 w-8 text-primary" />
                  <p className="text-sm font-medium">{fileName}</p>
                  <Badge variant="secondary">
                    {Object.keys(jsonContent).length} nodes
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setJsonContent(null);
                      setFileName(null);
                    }}
                  >
                    Remove
                  </Button>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Drag & drop a .json file or click to browse
                  </p>
                  <input
                    type="file"
                    accept=".json"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                    style={{ position: "relative" }}
                  />
                </>
              )}
            </div>

            {validationError && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{validationError}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || !jsonContent || saving}
          >
            {saving ? "Saving..." : "Upload & Configure"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
