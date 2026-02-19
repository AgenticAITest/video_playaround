"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, LayoutGrid } from "lucide-react";
import { WorkflowList } from "@/components/workflows/workflow-list";
import { ImportWizard } from "@/components/workflows/import-wizard";
import { WorkflowDiscover } from "@/components/workflows/workflow-discover";
import { TemplateBrowser } from "@/components/workflows/template-browser";

export default function WorkflowsPage() {
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Workflows</h2>
          <p className="text-muted-foreground">
            Discover, import, and manage your ComfyUI workflows
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Import Workflow
        </Button>
      </div>

      <Tabs defaultValue="my-workflows">
        <TabsList>
          <TabsTrigger value="my-workflows">
            My Workflows
          </TabsTrigger>
          <TabsTrigger value="discover" className="gap-1.5">
            <Search className="h-3.5 w-3.5" />
            Discover
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-workflows" className="mt-4">
          <WorkflowList />
        </TabsContent>

        <TabsContent value="discover" className="mt-4">
          <WorkflowDiscover />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <TemplateBrowser />
        </TabsContent>
      </Tabs>

      <ImportWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}
