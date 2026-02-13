"use client";

import { useState, useCallback } from "react";
import type { GenerationMode } from "@/types/generation";

interface UsePromptEnhanceResult {
  enhance: (
    prompt: string,
    mode: GenerationMode,
    lmStudioUrl: string,
    model?: string
  ) => Promise<string | null>;
  enhancing: boolean;
  error: string | null;
}

export function usePromptEnhance(): UsePromptEnhanceResult {
  const [enhancing, setEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enhance = useCallback(
    async (
      prompt: string,
      mode: GenerationMode,
      lmStudioUrl: string,
      model?: string
    ): Promise<string | null> => {
      setEnhancing(true);
      setError(null);

      try {
        const res = await fetch("/api/lmstudio/enhance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt, mode, lmStudioUrl, model }),
        });

        const data = await res.json();

        if (data.error) {
          setError(data.error);
          return null;
        }

        return data.enhancedPrompt || null;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Enhancement failed";
        setError(message);
        return null;
      } finally {
        setEnhancing(false);
      }
    },
    []
  );

  return { enhance, enhancing, error };
}
