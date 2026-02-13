"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Save, Wand2, Plus, ArrowLeft } from "lucide-react";
import { NodeInputMapper } from "./node-input-mapper";
import {
  listWorkflowNodes,
  autoDetectMappings,
  detectOutputNode,
} from "@/lib/comfyui/workflow-utils";
import type { WorkflowConfig, InputMapping, WorkflowCategory } from "@/types/workflow";

interface WorkflowEditorProps {
  workflow: WorkflowConfig;
}

export function WorkflowEditor({ workflow }: WorkflowEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(workflow.name);
  const [description, setDescription] = useState(workflow.description);
  const [category, setCategory] = useState<WorkflowCategory>(workflow.category);
  const [mappings, setMappings] = useState<InputMapping[]>(
    workflow.inputMappings
  );
  const [outputNodeId, setOutputNodeId] = useState(workflow.outputNodeId);
  const [saving, setSaving] = useState(false);

  const nodes = listWorkflowNodes(workflow.apiJson);

  // Get all possible output nodes
  const outputCandidates = nodes.filter((n) =>
    [
      "SaveImage",
      "PreviewImage",
      "SaveAnimatedWebP",
      "SaveAnimatedPNG",
      "VHS_VideoCombine",
      "SaveVideo",
    ].includes(n.classType)
  );

  const handleAutoDetect = () => {
    const detected = autoDetectMappings(workflow.apiJson);
    const detectedOutput = detectOutputNode(workflow.apiJson);
    setMappings(detected);
    if (detectedOutput) setOutputNodeId(detectedOutput);
    toast.success(`Auto-detected ${detected.length} input mappings`);
  };

  const handleAddMapping = (nodeId: string, fieldName: string) => {
    const node = nodes.find((n) => n.nodeId === nodeId);
    const newMapping: InputMapping = {
      nodeId,
      fieldName,
      uiType: "custom",
      label: fieldName,
      defaultValue: "",
    };
    setMappings([...mappings, newMapping]);
  };

  const handleUpdateMapping = (index: number, updated: InputMapping) => {
    const newMappings = [...mappings];
    newMappings[index] = updated;
    setMappings(newMappings);
  };

  const handleRemoveMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/workflows/${workflow.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          category,
          inputMappings: mappings,
          outputNodeId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      toast.success("Workflow saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save"
      );
    } finally {
      setSaving(false);
    }
  };

  // Track which node+field combos are already mapped
  const mappedKeys = new Set(
    mappings.map((m) => `${m.nodeId}:${m.fieldName}`)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/workflows")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">Edit Workflow</h2>
          <p className="text-sm text-muted-foreground">
            Configure input mappings and output node
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left: Settings + Mappings */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Basic Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={category}
                    onValueChange={(v) => setCategory(v as WorkflowCategory)}
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
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Output Node */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Output Node</CardTitle>
              <CardDescription>
                Select which node produces the final output
              </CardDescription>
            </CardHeader>
            <CardContent>
              {outputCandidates.length > 0 ? (
                <Select value={outputNodeId} onValueChange={setOutputNodeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select output node" />
                  </SelectTrigger>
                  <SelectContent>
                    {outputCandidates.map((n) => (
                      <SelectItem key={n.nodeId} value={n.nodeId}>
                        [{n.nodeId}] {n.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No standard output nodes detected. Enter the node ID manually:
                  </p>
                  <Input
                    value={outputNodeId}
                    onChange={(e) => setOutputNodeId(e.target.value)}
                    placeholder="Node ID"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Input Mappings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Input Mappings</CardTitle>
                  <CardDescription>
                    Map workflow node inputs to UI controls ({mappings.length}{" "}
                    mapped)
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleAutoDetect}>
                  <Wand2 className="mr-2 h-3 w-3" />
                  Auto-detect
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {mappings.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No mappings yet. Click &quot;Auto-detect&quot; or add mappings
                  manually from the node list.
                </p>
              ) : (
                <div className="space-y-3">
                  {mappings.map((mapping, idx) => {
                    const node = nodes.find(
                      (n) => n.nodeId === mapping.nodeId
                    );
                    return (
                      <NodeInputMapper
                        key={`${mapping.nodeId}-${mapping.fieldName}-${idx}`}
                        mapping={mapping}
                        nodeClassType={node?.classType || "Unknown"}
                        onUpdate={(updated) =>
                          handleUpdateMapping(idx, updated)
                        }
                        onRemove={() => handleRemoveMapping(idx)}
                      />
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Node Browser */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Workflow Nodes</CardTitle>
            <CardDescription>
              {nodes.length} nodes — click an input to map it
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="space-y-1 p-4">
                {nodes.map((node) => (
                  <div
                    key={node.nodeId}
                    className="rounded-md border border-border p-3"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {node.nodeId}
                      </Badge>
                      <span className="text-sm font-medium">{node.title}</span>
                    </div>
                    {node.inputs.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {node.inputs.map((input) => {
                          const isMapped = mappedKeys.has(
                            `${node.nodeId}:${input}`
                          );
                          return (
                            <Button
                              key={input}
                              variant={isMapped ? "secondary" : "outline"}
                              size="sm"
                              className="h-6 text-xs"
                              disabled={isMapped}
                              onClick={() =>
                                handleAddMapping(node.nodeId, input)
                              }
                            >
                              {isMapped && (
                                <span className="mr-1 text-primary">●</span>
                              )}
                              {input}
                            </Button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No editable inputs
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
