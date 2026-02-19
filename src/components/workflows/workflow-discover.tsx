"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Loader2,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Package,
  Cpu,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { useSettingsStore } from "@/lib/store/settings-store";

interface Recommendation {
  title: string;
  description: string;
  workflowType: string;
  requiredModels: string[];
  requiredNodes: string[];
  searchTerms: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  qualityVsSpeed: string;
}

interface SearchSuggestion {
  platform: string;
  searchUrl: string;
  searchQuery: string;
}

interface DiscoverResult {
  recommendations: Recommendation[];
  searchSuggestions: SearchSuggestion[];
  generalAdvice: string;
}

const difficultyColor: Record<string, string> = {
  beginner: "bg-green-500/10 text-green-600",
  intermediate: "bg-yellow-500/10 text-yellow-600",
  advanced: "bg-red-500/10 text-red-600",
};

export function WorkflowDiscover() {
  const { lmStudioUrl, lmStudioModel } = useSettingsStore();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<DiscoverResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/workflows/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: query.trim(),
          lmStudioUrl,
          model: lmStudioModel,
        }),
      });

      const data = await res.json();

      if (data.error && !data.recommendations) {
        setError(data.error);
      } else {
        setResult({
          recommendations: data.recommendations || [],
          searchSuggestions: data.searchSuggestions || [],
          generalAdvice: data.generalAdvice || "",
        });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to search. Make sure LM Studio is running."
      );
    } finally {
      setSearching(false);
    }
  }, [query, lmStudioUrl, lmStudioModel]);

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Describe what you want to create and AI will recommend ComfyUI
          workflows, models, and where to find them.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="e.g., turn a photo into a short animated video"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !searching) handleSearch();
            }}
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={!query.trim() || searching}
          >
            {searching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            "Turn a photo into a video",
            "Generate realistic portraits",
            "Upscale and enhance images",
            "Create anime-style art",
            "Generate a video from text",
          ].map((suggestion) => (
            <button
              key={suggestion}
              className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
              onClick={() => {
                setQuery(suggestion);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p>{error}</p>
            <p className="text-xs mt-1">
              Make sure LM Studio is running with a model loaded.
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {searching && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Finding workflows for you...
          </p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* General Advice */}
          {result.generalAdvice && (
            <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm">{result.generalAdvice}</p>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Recommended Approaches
              </h3>
              <div className="grid gap-3">
                {result.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="rounded-lg border p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-sm">{rec.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {rec.description}
                        </p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {rec.workflowType}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${difficultyColor[rec.difficulty] || ""}`}
                        >
                          {rec.difficulty}
                        </Badge>
                      </div>
                    </div>

                    {rec.requiredModels.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Cpu className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {rec.requiredModels.map((model, j) => (
                            <Badge
                              key={j}
                              variant="secondary"
                              className="text-xs font-mono"
                            >
                              {model}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {rec.requiredNodes.length > 0 && (
                      <div className="flex items-start gap-2">
                        <Package className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex flex-wrap gap-1">
                          {rec.requiredNodes.map((node, j) => (
                            <Badge
                              key={j}
                              variant="outline"
                              className="text-xs font-mono"
                            >
                              {node}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {rec.qualityVsSpeed && (
                      <p className="text-xs text-muted-foreground italic">
                        {rec.qualityVsSpeed}
                      </p>
                    )}

                    {rec.searchTerms.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {rec.searchTerms.map((term, j) => (
                          <a
                            key={j}
                            href={`https://civitai.com/search/models?sortBy=models_v9&query=${encodeURIComponent(term)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs hover:bg-muted/80 transition-colors"
                          >
                            Search: {term}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Suggestions */}
          {result.searchSuggestions.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Search Links
                </h3>
                <div className="grid gap-2">
                  {result.searchSuggestions.map((suggestion, i) => (
                    <a
                      key={i}
                      href={suggestion.searchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors group"
                    >
                      <Badge variant="outline" className="shrink-0">
                        {suggestion.platform}
                      </Badge>
                      <span className="text-sm text-muted-foreground flex-1 truncate">
                        {suggestion.searchQuery}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}

          {result.recommendations.length === 0 &&
            result.searchSuggestions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No specific recommendations found. Try describing what you want
                in more detail.
              </p>
            )}
        </div>
      )}

      {/* Empty state */}
      {!result && !searching && !error && (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <Sparkles className="h-10 w-10 text-muted-foreground/50" />
          <div>
            <p className="text-sm font-medium">AI Workflow Finder</p>
            <p className="text-xs text-muted-foreground mt-1">
              Describe what you want to create and get personalized workflow
              recommendations with direct links to download them.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
