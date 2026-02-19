"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Play, Square, RotateCcw, Wifi, WifiOff, Loader2 } from "lucide-react";
import { PromptInput } from "./prompt-input";
import { WorkflowSelector } from "./workflow-selector";
import { GenerationParamsPanel } from "./generation-params";
import { ImageUploader } from "./image-uploader";
import { AudioUploader } from "./audio-uploader";
import { ProgressDisplay } from "./progress-display";
import { OutputDisplay } from "./output-display";
import { useGeneration } from "@/lib/hooks/use-generation";
import { useComfyuiStatus } from "@/lib/hooks/use-comfyui-status";
import { useSettingsStore } from "@/lib/store/settings-store";
import type { GenerationMode, GenerationParams } from "@/types/generation";
import type { WorkflowConfig, WorkflowCategory } from "@/types/workflow";

interface GenerationFormProps {
  mode: GenerationMode;
}

export function GenerationForm({ mode }: GenerationFormProps) {
  const settings = useSettingsStore();
  const gen = useGeneration(mode);
  const { status: comfyStatus } = useComfyuiStatus();

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [selectedWorkflow, setSelectedWorkflow] =
    useState<WorkflowConfig | null>(null);
  const [inputImageFilename, setInputImageFilename] = useState<string | null>(
    null
  );
  const [inputAudioFilename, setInputAudioFilename] = useState<string | null>(
    null
  );
  const [params, setParams] = useState<GenerationParams>({
    width: settings.defaultWidth,
    height: settings.defaultHeight,
    steps: settings.defaultSteps,
    cfgScale: settings.defaultCfgScale,
    seed: -1,
  });

  // When a workflow is selected, pre-populate prompts and params from its defaults
  const handleWorkflowSelect = useCallback((wf: WorkflowConfig) => {
    setSelectedWorkflow(wf);

    for (const mapping of wf.inputMappings) {
      const val = mapping.defaultValue;
      if (val === undefined || val === null) continue;

      switch (mapping.uiType) {
        case "prompt":
          if (!prompt) setPrompt(String(val));
          break;
        case "negative_prompt":
          if (!negativePrompt) setNegativePrompt(String(val));
          break;
        case "width":
          setParams((p) => ({ ...p, width: Number(val) || p.width }));
          break;
        case "height":
          setParams((p) => ({ ...p, height: Number(val) || p.height }));
          break;
        case "steps":
          setParams((p) => ({ ...p, steps: Number(val) || p.steps }));
          break;
        case "cfg":
          setParams((p) => ({ ...p, cfgScale: Number(val) || p.cfgScale }));
          break;
        case "seed":
          setParams((p) => ({ ...p, seed: Number(val) ?? p.seed }));
          break;
        case "checkpoint":
          setParams((p) => ({ ...p, ckpt_name: String(val) }));
          break;
        case "sampler":
          setParams((p) => ({ ...p, sampler_name: String(val) }));
          break;
        case "scheduler":
          setParams((p) => ({ ...p, scheduler: String(val) }));
          break;
      }
    }
  }, [prompt, negativePrompt]);

  const isGenerating =
    gen.status !== "idle" &&
    gen.status !== "completed" &&
    gen.status !== "error";

  const canGenerate =
    prompt.trim() && selectedWorkflow && !isGenerating;

  const handleEnhance = useCallback(async () => {
    if (!prompt.trim()) return;
    await gen.enhancePrompt(prompt);
  }, [prompt, gen]);

  const handleGenerate = useCallback(async () => {
    if (!selectedWorkflow || !prompt.trim()) return;

    await gen.generate({
      workflowId: selectedWorkflow.id,
      prompt,
      negativePrompt,
      params,
      inputImageFilename: inputImageFilename || inputAudioFilename || undefined,
    });
  }, [
    selectedWorkflow,
    prompt,
    negativePrompt,
    params,
    inputImageFilename,
    inputAudioFilename,
    gen,
  ]);

  const handleReset = useCallback(() => {
    gen.reset();
  }, [gen]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      {/* Left column: Main generation area */}
      <div className="space-y-4 min-w-0">
        {/* Prompt */}
        <Card>
          <CardContent className="pt-6">
            <PromptInput
              prompt={prompt}
              onPromptChange={setPrompt}
              negativePrompt={negativePrompt}
              onNegativePromptChange={setNegativePrompt}
              enhancedPrompt={gen.enhancedPrompt}
              onEnhance={handleEnhance}
              onClearEnhanced={() => gen.reset()}
              enhancing={gen.enhancing}
              disabled={isGenerating}
            />
          </CardContent>
        </Card>

        {/* Image uploader for image-based input modes */}
        {(mode === "image-to-video" || mode === "image-to-image") && (
          <Card>
            <CardContent className="pt-6">
              <ImageUploader
                uploadedFilename={inputImageFilename}
                onUpload={setInputImageFilename}
                onRemove={() => setInputImageFilename(null)}
                disabled={isGenerating}
              />
            </CardContent>
          </Card>
        )}

        {/* Audio uploader for music-to-music */}
        {mode === "music-to-music" && (
          <Card>
            <CardContent className="pt-6">
              <AudioUploader
                uploadedFilename={inputAudioFilename}
                onUpload={setInputAudioFilename}
                onRemove={() => setInputAudioFilename(null)}
                disabled={isGenerating}
              />
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        <ProgressDisplay
          status={gen.status}
          progress={gen.progress}
          progressValue={gen.progressValue}
          progressMax={gen.progressMax}
          currentNode={gen.currentNode}
          previewBlob={gen.previewBlob}
          error={gen.error}
          elapsedMs={gen.elapsedMs}
          queueRemaining={gen.queueRemaining}
          stalled={gen.stalled}
        />

        {/* Output */}
        <OutputDisplay outputFiles={gen.outputFiles} />
      </div>

      {/* Right column: Controls */}
      <div className="space-y-4">
        {/* Connection status */}
        <div className="flex items-center gap-2">
          {comfyStatus === "checking" && (
            <Badge variant="outline" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Checking ComfyUI...
            </Badge>
          )}
          {comfyStatus === "connected" && (
            <Badge
              variant="outline"
              className="gap-1 border-green-500/50 text-green-500"
            >
              <Wifi className="h-3 w-3" />
              ComfyUI Connected
            </Badge>
          )}
          {comfyStatus === "disconnected" && (
            <Badge
              variant="outline"
              className="gap-1 border-destructive/50 text-destructive"
            >
              <WifiOff className="h-3 w-3" />
              ComfyUI Disconnected
            </Badge>
          )}
        </div>

        {/* Workflow selector */}
        <Card>
          <CardContent className="pt-6">
            <WorkflowSelector
              category={mode as WorkflowCategory}
              selectedId={selectedWorkflow?.id || null}
              onSelect={handleWorkflowSelect}
            />
          </CardContent>
        </Card>

        {/* Parameters */}
        {selectedWorkflow && (
          <Card>
            <CardContent className="pt-6">
              <GenerationParamsPanel
                params={params}
                onChange={setParams}
                mappings={selectedWorkflow.inputMappings}
                disabled={isGenerating}
              />
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Generate / Stop / New buttons */}
        <div className="flex gap-2">
          {isGenerating ? (
            <Button
              className="flex-1"
              size="lg"
              variant="destructive"
              onClick={() => gen.cancel()}
            >
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          ) : (
            <Button
              className="flex-1"
              size="lg"
              onClick={handleGenerate}
              disabled={!canGenerate}
            >
              <Play className="mr-2 h-4 w-4" />
              Generate
            </Button>
          )}

          {(gen.status === "completed" || gen.status === "error") && (
            <Button variant="outline" size="lg" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" />
              New
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
