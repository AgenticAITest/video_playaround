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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Upload,
  FileJson,
  AlertCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Sparkles,
  Package,
  Cpu,
  Lightbulb,
  Settings2,
} from "lucide-react";
import { validateApiFormat } from "@/lib/comfyui/workflow-utils";
import { getNodeFriendlyName } from "@/lib/comfyui/node-descriptions";
import type { WorkflowCategory, InputMapping } from "@/types/workflow";
import type {
  WorkflowAnalysis,
  ModelReference,
} from "@/lib/comfyui/workflow-analyzer";
import { useSettingsStore } from "@/lib/store/settings-store";

type WizardStep = "upload" | "analyze" | "explain" | "configure" | "save";

interface WorkflowExplanation {
  summary: string;
  nodeGroups: { groupName: string; explanation: string }[];
  keyParameters: { name: string; tip: string }[];
  tips: string[];
}

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportWizard({ open, onOpenChange }: ImportWizardProps) {
  const router = useRouter();
  const { comfyuiUrl, lmStudioUrl, lmStudioModel } = useSettingsStore();

  // Step state
  const [step, setStep] = useState<WizardStep>("upload");

  // Upload step
  const [jsonContent, setJsonContent] = useState<Record<string, unknown> | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Analysis step
  const [analysis, setAnalysis] = useState<WorkflowAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Explanation step
  const [explanation, setExplanation] = useState<WorkflowExplanation | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  // Configure step
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<WorkflowCategory>("text-to-image");
  const [mappings, setMappings] = useState<InputMapping[]>([]);
  const [outputNodeId, setOutputNodeId] = useState("");

  // Save step
  const [saving, setSaving] = useState(false);

  const resetAll = useCallback(() => {
    setStep("upload");
    setJsonContent(null);
    setFileName(null);
    setValidationError(null);
    setAnalysis(null);
    setAnalyzing(false);
    setAnalyzeError(null);
    setExplanation(null);
    setExplaining(false);
    setExplainError(null);
    setName("");
    setDescription("");
    setCategory("text-to-image");
    setMappings([]);
    setOutputNodeId("");
    setSaving(false);
  }, []);

  // --- File handling ---
  const handleFileSelect = useCallback((file: File) => {
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
        setName(file.name.replace(/\.json$/, "").replace(/[_-]/g, " "));
      } catch {
        setValidationError("Invalid JSON file");
        setJsonContent(null);
      }
    };
    reader.readAsText(file);
  }, []);

  const handlePasteJson = useCallback((text: string) => {
    try {
      const parsed = JSON.parse(text);
      const error = validateApiFormat(parsed);
      if (error) {
        setValidationError(error);
        setJsonContent(null);
        return;
      }
      setJsonContent(parsed);
      setFileName("pasted-workflow.json");
      setValidationError(null);
      if (!name) setName("Pasted Workflow");
    } catch {
      setValidationError("Invalid JSON — make sure you paste the complete workflow");
      setJsonContent(null);
    }
  }, [name]);

  // --- Analysis ---
  const runAnalysis = useCallback(async () => {
    if (!jsonContent) return;
    setAnalyzing(true);
    setAnalyzeError(null);

    try {
      // Fetch object_info from ComfyUI for compatibility check
      let objectInfo: Record<string, unknown> | undefined;
      try {
        const res = await fetch(
          `/api/comfyui/models?comfyuiUrl=${encodeURIComponent(comfyuiUrl)}`
        );
        if (res.ok) {
          objectInfo = await res.json();
        }
      } catch {
        // ComfyUI not available — we'll still analyze without compatibility info
      }

      // Run analysis client-side using the analyzer module
      const { analyzeWorkflow } = await import("@/lib/comfyui/workflow-analyzer");
      const result = analyzeWorkflow(jsonContent, objectInfo);

      setAnalysis(result);
      setCategory(result.suggestedCategory);
      setMappings(result.suggestedMappings);
      setOutputNodeId(result.outputNodeId || "");
      setStep("analyze");
    } catch (err) {
      setAnalyzeError(
        err instanceof Error ? err.message : "Analysis failed"
      );
    } finally {
      setAnalyzing(false);
    }
  }, [jsonContent, comfyuiUrl]);

  // --- LM Studio Explanation ---
  const runExplanation = useCallback(async () => {
    if (!analysis) return;
    setExplaining(true);
    setExplainError(null);

    try {
      const res = await fetch("/api/lmstudio/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowSummary: analysis.summaryForLLM,
          lmStudioUrl,
          model: lmStudioModel,
        }),
      });

      const data = await res.json();
      if (data.explanation) {
        setExplanation(data.explanation);
        setStep("explain");
      } else {
        setExplainError(data.error || "Could not get explanation");
      }
    } catch (err) {
      setExplainError(
        err instanceof Error ? err.message : "Failed to connect to LM Studio"
      );
    } finally {
      setExplaining(false);
    }
  }, [analysis, lmStudioUrl, lmStudioModel]);

  // --- Save ---
  const handleSave = useCallback(async () => {
    if (!name.trim() || !jsonContent) return;

    setSaving(true);
    try {
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
      toast.success("Workflow imported successfully");
      resetAll();
      onOpenChange(false);
      router.push(`/workflows/${workflow.id}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save workflow"
      );
    } finally {
      setSaving(false);
    }
  }, [name, description, category, jsonContent, mappings, outputNodeId, resetAll, onOpenChange, router]);

  // --- Step Navigation ---
  const steps: WizardStep[] = ["upload", "analyze", "explain", "configure", "save"];
  const stepIndex = steps.indexOf(step);

  const stepLabels: Record<WizardStep, string> = {
    upload: "Upload",
    analyze: "Compatibility",
    explain: "Explanation",
    configure: "Configure",
    save: "Review & Save",
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetAll();
        onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Workflow</DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-1 pt-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <div
                  className={`flex h-6 items-center rounded-full px-2 text-xs font-medium transition-colors ${
                    i < stepIndex
                      ? "bg-primary/20 text-primary"
                      : i === stepIndex
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {i < stepIndex ? <CheckCircle2 className="mr-1 h-3 w-3" /> : null}
                  {stepLabels[s]}
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {/* STEP: Upload */}
          {step === "upload" && (
            <div className="space-y-4 py-2">
              {/* File Drop Zone */}
              <div
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileSelect(file);
                }}
                onDragOver={(e) => e.preventDefault()}
                className="relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50"
              >
                {jsonContent ? (
                  <>
                    <FileJson className="h-10 w-10 text-primary" />
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
                        setValidationError(null);
                      }}
                    >
                      Remove
                    </Button>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Drag & drop a ComfyUI workflow JSON file
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Must be API format (not visual format)
                    </p>
                    <input
                      type="file"
                      accept=".json"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />
                  </>
                )}
              </div>

              {/* Paste JSON */}
              {!jsonContent && (
                <div className="space-y-2">
                  <Label>Or paste workflow JSON</Label>
                  <Textarea
                    placeholder='{"1": {"class_type": "CheckpointLoaderSimple", ...}}'
                    rows={4}
                    onChange={(e) => {
                      if (e.target.value.trim()) {
                        handlePasteJson(e.target.value.trim());
                      }
                    }}
                  />
                </div>
              )}

              {validationError && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{validationError}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP: Analyze (compatibility) */}
          {step === "analyze" && analysis && (
            <div className="space-y-4 py-2">
              {/* Node Compatibility */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <h3 className="font-semibold">Custom Nodes</h3>
                  {analysis.compatibility.allInstalled ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                      All installed
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      {analysis.compatibility.missingNodes.length} missing
                    </Badge>
                  )}
                </div>

                {analysis.compatibility.allInstalled ? (
                  <p className="text-sm text-muted-foreground">
                    All {analysis.compatibility.totalWorkflowNodes} node types
                    used in this workflow are installed in your ComfyUI.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {analysis.compatibility.installedNodes.length} of{" "}
                      {analysis.compatibility.totalWorkflowNodes} node types are installed.
                      You need to install the missing ones before using this workflow.
                    </p>
                    <div className="space-y-1">
                      {analysis.compatibility.missingNodes.map((node) => (
                        <div
                          key={node}
                          className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-1.5 text-sm"
                        >
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                          <span className="font-mono text-xs">{node}</span>
                          <span className="text-muted-foreground">
                            — {getNodeFriendlyName(node)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Install missing nodes via ComfyUI Manager or manually from GitHub.
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Model Compatibility */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  <h3 className="font-semibold">Models</h3>
                  {analysis.models.references.length === 0 ? (
                    <Badge variant="secondary">No models referenced</Badge>
                  ) : analysis.models.allAvailable ? (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                      All available
                    </Badge>
                  ) : analysis.models.missingModels.length > 0 ? (
                    <Badge variant="destructive">
                      {analysis.models.missingModels.length} missing
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      {analysis.models.references.length} referenced
                    </Badge>
                  )}
                </div>

                {analysis.models.references.length > 0 && (
                  <div className="space-y-1">
                    {analysis.models.references.map((ref, i) => {
                      const isMissing = analysis.models.missingModels.some(
                        (m) =>
                          m.nodeId === ref.nodeId && m.fieldName === ref.fieldName
                      );
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
                            isMissing ? "bg-destructive/10" : "bg-green-500/5"
                          }`}
                        >
                          {isMissing ? (
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          )}
                          <span className="font-mono text-xs truncate">
                            {ref.modelName}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {ref.modelType}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}

                {analysis.models.missingModels.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Download missing models from CivitAI or Hugging Face and place
                    them in the appropriate ComfyUI model folder.
                  </p>
                )}
              </div>

              <Separator />

              {/* Node overview */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  <h3 className="font-semibold">Workflow Nodes</h3>
                  <Badge variant="secondary">{analysis.nodes.length} nodes</Badge>
                </div>
                <div className="grid gap-1 max-h-40 overflow-y-auto">
                  {analysis.nodes.map((node) => (
                    <div
                      key={node.nodeId}
                      className="flex items-center gap-2 text-xs rounded px-2 py-1 bg-muted/50"
                    >
                      <span className="text-muted-foreground w-6 text-right">
                        #{node.nodeId}
                      </span>
                      <span className="font-medium">{node.friendlyName}</span>
                      <span className="text-muted-foreground font-mono">
                        {node.classType}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP: Explain */}
          {step === "explain" && (
            <div className="space-y-4 py-2">
              {explanation ? (
                <>
                  {/* Summary */}
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold">What This Workflow Does</h3>
                    </div>
                    <p className="text-sm">{explanation.summary}</p>
                  </div>

                  {/* Node Groups */}
                  {explanation.nodeGroups.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">How It Works</h3>
                      <div className="space-y-2">
                        {explanation.nodeGroups.map((group, i) => (
                          <div
                            key={i}
                            className="rounded-md border px-3 py-2"
                          >
                            <p className="text-sm font-medium">
                              {group.groupName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {group.explanation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Key Parameters */}
                  {explanation.keyParameters.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm">
                        Parameters You Can Adjust
                      </h3>
                      <div className="space-y-1">
                        {explanation.keyParameters.map((param, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-sm"
                          >
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {param.name}
                            </Badge>
                            <span className="text-muted-foreground text-xs">
                              {param.tip}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tips */}
                  {explanation.tips.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-500" />
                        <h3 className="font-semibold text-sm">Tips</h3>
                      </div>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {explanation.tips.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-yellow-500 mt-0.5">-</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : explaining ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Asking AI to explain this workflow...
                  </p>
                </div>
              ) : explainError ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium">Could not get AI explanation</p>
                      <p className="text-xs mt-1">{explainError}</p>
                      <p className="text-xs mt-1">
                        Make sure LM Studio is running and a model is loaded.
                        You can skip this step and configure the workflow manually.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* STEP: Configure */}
          {step === "configure" && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="wiz-name">Workflow Name</Label>
                <Input
                  id="wiz-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Awesome Workflow"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="wiz-desc">Description (optional)</Label>
                <Textarea
                  id="wiz-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what this workflow does..."
                  rows={2}
                />
                {explanation?.summary && !description && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setDescription(explanation.summary)}
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    Use AI summary as description
                  </Button>
                )}
              </div>

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
                {analysis?.suggestedCategory && (
                  <p className="text-xs text-muted-foreground">
                    Auto-detected: {analysis.suggestedCategory}
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Auto-Detected Mappings</Label>
                  <Badge variant="secondary">{mappings.length} controls</Badge>
                </div>
                {mappings.length > 0 ? (
                  <div className="space-y-1">
                    {mappings.map((m, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-sm"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        <Badge variant="outline" className="text-xs">
                          {m.uiType}
                        </Badge>
                        <span>{m.label}</span>
                        <span className="ml-auto text-xs text-muted-foreground font-mono">
                          Node #{m.nodeId} → {m.fieldName}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No mappings auto-detected. You can configure them manually
                    after import in the workflow editor.
                  </p>
                )}
              </div>

              {outputNodeId && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span>Output node detected: #{outputNodeId}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP: Review & Save */}
          {step === "save" && (
            <div className="space-y-4 py-2">
              <h3 className="font-semibold">Review before saving</h3>

              <div className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{name}</span>
                  <Badge>{category}</Badge>
                </div>
                {description && (
                  <p className="text-xs text-muted-foreground">{description}</p>
                )}
                <Separator />
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted-foreground">Nodes:</span>
                  <span>{analysis?.nodes.length ?? Object.keys(jsonContent || {}).length}</span>
                  <span className="text-muted-foreground">Mapped controls:</span>
                  <span>{mappings.length}</span>
                  <span className="text-muted-foreground">Output node:</span>
                  <span>{outputNodeId || "Not detected"}</span>
                  {analysis && !analysis.compatibility.allInstalled && (
                    <>
                      <span className="text-destructive">Missing nodes:</span>
                      <span className="text-destructive">
                        {analysis.compatibility.missingNodes.length}
                      </span>
                    </>
                  )}
                  {analysis && analysis.models.missingModels.length > 0 && (
                    <>
                      <span className="text-destructive">Missing models:</span>
                      <span className="text-destructive">
                        {analysis.models.missingModels.length}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {analysis &&
                (!analysis.compatibility.allInstalled ||
                  analysis.models.missingModels.length > 0) && (
                  <div className="flex items-start gap-2 rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-xs">
                      This workflow has missing nodes or models. You can still
                      save it, but it won&apos;t work until you install the
                      missing components in ComfyUI.
                    </p>
                  </div>
                )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-row justify-between sm:justify-between gap-2">
          <div>
            {step !== "upload" && (
              <Button
                variant="ghost"
                onClick={() => {
                  const prev = steps[stepIndex - 1];
                  if (prev) setStep(prev);
                }}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>

            {step === "upload" && (
              <Button
                onClick={runAnalysis}
                disabled={!jsonContent || analyzing}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    Analyze
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            )}

            {step === "analyze" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setStep("configure")}
                >
                  Skip Explanation
                </Button>
                <Button
                  onClick={async () => {
                    setStep("explain");
                    await runExplanation();
                  }}
                  disabled={explaining}
                >
                  {explaining ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Explaining...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1 h-4 w-4" />
                      Explain with AI
                    </>
                  )}
                </Button>
              </>
            )}

            {step === "explain" && (
              <Button
                onClick={() => setStep("configure")}
                disabled={explaining}
              >
                Configure
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}

            {step === "configure" && (
              <Button
                onClick={() => setStep("save")}
                disabled={!name.trim()}
              >
                Review
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}

            {step === "save" && (
              <Button onClick={handleSave} disabled={saving || !name.trim()}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Workflow"
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
