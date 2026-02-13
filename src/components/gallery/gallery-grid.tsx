"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GalleryCard } from "./gallery-card";
import { GalleryFilters } from "./gallery-filters";
import { useSettingsStore } from "@/lib/store/settings-store";
import type { GenerationRecord, GenerationMode } from "@/types/generation";
import { LayoutGrid } from "lucide-react";

const PAGE_SIZE = 20;

export function GalleryGrid() {
  const comfyuiUrl = useSettingsStore((s) => s.comfyuiUrl);
  const [generations, setGenerations] = useState<GenerationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mode, setMode] = useState<GenerationMode | null>(null);
  const [offset, setOffset] = useState(0);

  const fetchGenerations = useCallback(
    async (modeFilter: GenerationMode | null, currentOffset: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(currentOffset),
        });
        if (modeFilter) params.set("mode", modeFilter);

        const res = await fetch(`/api/generations?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (append) {
            setGenerations((prev) => [...prev, ...data.generations]);
          } else {
            setGenerations(data.generations);
          }
          setTotal(data.total);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Fetch on mount and when mode changes
  useEffect(() => {
    setOffset(0);
    fetchGenerations(mode, 0, false);
  }, [mode, fetchGenerations]);

  const handleLoadMore = () => {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    fetchGenerations(mode, newOffset, true);
  };

  const hasMore = generations.length < total;

  return (
    <div className="space-y-4">
      <GalleryFilters
        activeMode={mode}
        onModeChange={setMode}
        total={total}
      />

      {loading ? (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : generations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <LayoutGrid className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium">No generations yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Start generating images and videos to see them here
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {generations.map((gen) => (
              <GalleryCard
                key={gen.id}
                generation={gen}
                comfyuiUrl={comfyuiUrl}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
