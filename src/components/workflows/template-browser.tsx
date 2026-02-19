"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Image,
  Film,
  Video,
  ArrowUpCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Cpu,
  Package,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import {
  WORKFLOW_TEMPLATES,
  type WorkflowTemplate,
} from "@/lib/templates/index";
import { useSettingsStore } from "@/lib/store/settings-store";
import type { WorkflowCategory } from "@/types/workflow";

const categoryIcon: Record<string, React.ReactNode> = {
  "text-to-image": <Image className="h-5 w-5" />,
  "text-to-video": <Film className="h-5 w-5" />,
  "image-to-video": <Video className="h-5 w-5" />,
};

const categoryLabel: Record<string, string> = {
  "text-to-image": "Text to Image",
  "text-to-video": "Text to Video",
  "image-to-video": "Image to Video",
};

const difficultyColor: Record<string, string> = {
  beginner: "bg-green-500/10 text-green-600",
  intermediate: "bg-yellow-500/10 text-yellow-600",
  advanced: "bg-red-500/10 text-red-600",
};

interface CompatCheckResult {
  missingNodes: string[];
  missingModels: string[];
  allGood: boolean;
}

export function TemplateBrowser() {
  const router = useRouter();
  const { comfyuiUrl } = useSettingsStore();
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [compat, setCompat] = useState<CompatCheckResult | null>(null);
  const [installing, setInstalling] = useState(false);
  const [filterCategory, setFilterCategory] = useState<WorkflowCategory | "all">("all");

  const filteredTemplates =
    filterCategory === "all"
      ? WORKFLOW_TEMPLATES
      : WORKFLOW_TEMPLATES.filter((t) => t.category === filterCategory);

  const openTemplate = useCallback(
    async (template: WorkflowTemplate) => {
      setSelectedTemplate(template);
      setDetailOpen(true);
      setCompat(null);
      setChecking(true);

      try {
        const res = await fetch(
          `/api/comfyui/models?comfyuiUrl=${encodeURIComponent(comfyuiUrl)}`
        );
        if (res.ok) {
          const objectInfo = await res.json();
          const installedTypes = new Set(Object.keys(objectInfo));

          // Check nodes
          const workflowTypes = new Set<string>();
          for (const rawNode of Object.values(template.apiJson)) {
            const node = rawNode as { class_type?: string };
            if (node?.class_type) workflowTypes.add(node.class_type);
          }
          const missingNodes = [...workflowTypes].filter(
            (t) => !installedTypes.has(t)
          );

          // Check models
          const missingModels: string[] = [];
          for (const model of template.requiredModels) {
            // Try to find the model in object_info
            let found = false;
            for (const nodeInfo of Object.values(objectInfo)) {
              const info = nodeInfo as {
                input?: {
                  required?: Record<string, unknown>;
                  optional?: Record<string, unknown>;
                };
              };
              if (!info?.input) continue;
              const allInputs = {
                ...info.input.required,
                ...info.input.optional,
              };
              for (const fieldDef of Object.values(allInputs)) {
                if (Array.isArray(fieldDef) && Array.isArray(fieldDef[0])) {
                  if ((fieldDef[0] as string[]).includes(model.name)) {
                    found = true;
                    break;
                  }
                }
              }
              if (found) break;
            }
            if (!found) missingModels.push(model.name);
          }

          setCompat({
            missingNodes,
            missingModels,
            allGood: missingNodes.length === 0 && missingModels.length === 0,
          });
        }
      } catch {
        // ComfyUI not available — can't check
        setCompat(null);
      } finally {
        setChecking(false);
      }
    },
    [comfyuiUrl]
  );

  const handleInstall = useCallback(async () => {
    if (!selectedTemplate) return;
    setInstalling(true);

    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedTemplate.name,
          description: selectedTemplate.description,
          category: selectedTemplate.category,
          apiJson: selectedTemplate.apiJson,
          inputMappings: selectedTemplate.inputMappings,
          outputNodeId: selectedTemplate.outputNodeId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to install template");
      }

      const workflow = await res.json();
      toast.success(`Template "${selectedTemplate.name}" installed`);
      setDetailOpen(false);
      router.push(`/workflows/${workflow.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to install template"
      );
    } finally {
      setInstalling(false);
    }
  }, [selectedTemplate, router]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pre-built workflow templates ready to use. Select a template to check
        compatibility and install it.
      </p>

      {/* Category filter */}
      <div className="flex gap-1.5">
        {(["all", "text-to-image", "text-to-video", "image-to-video"] as const).map(
          (cat) => (
            <Button
              key={cat}
              variant={filterCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterCategory(cat)}
              className="text-xs"
            >
              {cat === "all" ? "All" : categoryLabel[cat]}
            </Button>
          )
        )}
      </div>

      {/* Template grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filteredTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => openTemplate(template)}
            className="flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              {categoryIcon[template.category]}
              <span className="font-medium text-sm">{template.name}</span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {template.description}
            </p>
            <div className="flex items-center gap-1.5 mt-auto pt-1">
              <Badge variant="outline" className="text-xs">
                {categoryLabel[template.category]}
              </Badge>
              <Badge
                variant="secondary"
                className={`text-xs ${difficultyColor[template.difficulty]}`}
              >
                {template.difficulty}
              </Badge>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
            </div>
          </button>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No templates in this category yet.
        </p>
      )}

      {/* Template detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {categoryIcon[selectedTemplate.category]}
                  {selectedTemplate.name}
                </DialogTitle>
              </DialogHeader>

              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-4 py-2">
                  <p className="text-sm">{selectedTemplate.description}</p>

                  <div className="rounded-md bg-muted/50 p-3 text-sm">
                    <span className="font-medium">Example use case: </span>
                    <span className="text-muted-foreground">
                      {selectedTemplate.exampleUseCase}
                    </span>
                  </div>

                  <Separator />

                  {/* Required Models */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Cpu className="h-4 w-4" />
                      <h3 className="font-semibold text-sm">Required Models</h3>
                    </div>
                    <div className="space-y-2">
                      {selectedTemplate.requiredModels.map((model, i) => {
                        const isMissing =
                          compat?.missingModels.includes(model.name) ?? false;
                        return (
                          <div
                            key={i}
                            className={`rounded-md px-3 py-2 text-sm ${
                              checking
                                ? "bg-muted/50"
                                : isMissing
                                  ? "bg-destructive/10"
                                  : compat
                                    ? "bg-green-500/5"
                                    : "bg-muted/50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {checking ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : compat ? (
                                isMissing ? (
                                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                )
                              ) : null}
                              <span className="font-mono text-xs">
                                {model.name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {model.type}
                              </Badge>
                            </div>
                            {isMissing && (
                              <p className="text-xs text-muted-foreground mt-1 pl-5">
                                {model.downloadHint}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Required Custom Nodes */}
                  {selectedTemplate.requiredCustomNodes.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <h3 className="font-semibold text-sm">
                          Required Custom Nodes
                        </h3>
                      </div>
                      <div className="space-y-1">
                        {selectedTemplate.requiredCustomNodes.map((node, i) => {
                          const isMissing =
                            compat?.missingNodes.includes(node) ?? false;
                          return (
                            <div
                              key={i}
                              className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
                                checking
                                  ? "bg-muted/50"
                                  : isMissing
                                    ? "bg-destructive/10"
                                    : compat
                                      ? "bg-green-500/5"
                                      : "bg-muted/50"
                              }`}
                            >
                              {checking ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : compat ? (
                                isMissing ? (
                                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                )
                              ) : null}
                              <span className="font-mono text-xs">{node}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Compatibility summary */}
                  {compat && !compat.allGood && (
                    <div className="flex items-start gap-2 rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="text-xs">
                        <p className="font-medium">
                          Some components are not installed
                        </p>
                        <p className="mt-1">
                          You can still install this template, but it won&apos;t work
                          until you download the missing models and install the
                          required custom nodes in ComfyUI.
                        </p>
                      </div>
                    </div>
                  )}

                  {compat?.allGood && (
                    <div className="flex items-center gap-2 rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-medium">
                        All requirements met — ready to use!
                      </span>
                    </div>
                  )}

                  <Separator />

                  {/* Mapped controls preview */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">
                      Configurable Parameters
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTemplate.inputMappings.map((m, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {m.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInstall} disabled={installing}>
                  {installing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Installing...
                    </>
                  ) : (
                    <>
                      <ArrowUpCircle className="mr-2 h-4 w-4" />
                      Install Template
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
