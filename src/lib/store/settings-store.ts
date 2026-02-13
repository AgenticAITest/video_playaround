"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/lib/constants";

interface SettingsStore extends AppSettings {
  update: (partial: Partial<AppSettings>) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (partial) => set((state) => ({ ...state, ...partial })),
      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: "mediagen-settings",
    }
  )
);
