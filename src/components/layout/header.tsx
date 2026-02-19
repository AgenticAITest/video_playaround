"use client";

import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/text-to-image": "Text to Image",
  "/image-to-image": "Image to Image",
  "/text-to-video": "Text to Video",
  "/image-to-video": "Image to Video",
  "/text-to-music": "Text to Music",
  "/music-to-music": "Music to Music",
  "/gallery": "Gallery",
  "/workflows": "Workflows",
  "/settings": "Settings",
};

export function Header() {
  const pathname = usePathname();

  const title =
    pageTitles[pathname] ||
    (pathname.startsWith("/gallery/")
      ? "Generation Details"
      : pathname.startsWith("/workflows/")
        ? "Workflow Editor"
        : "Nimbus MediaGen");

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <Separator orientation="vertical" className="h-6" />
      <p className="text-sm text-muted-foreground">
        {getSubtitle(pathname)}
      </p>
    </header>
  );
}

function getSubtitle(pathname: string): string {
  switch (pathname) {
    case "/":
      return "AI-powered image and video generation";
    case "/text-to-image":
      return "Generate images from text descriptions";
    case "/text-to-video":
      return "Generate videos from text descriptions";
    case "/image-to-video":
      return "Animate images into videos";
    case "/text-to-music":
      return "Generate music from text descriptions";
    case "/image-to-image":
      return "Transform images with AI";
    case "/music-to-music":
      return "Transform and remix music with AI";
    case "/gallery":
      return "Browse your past generations";
    case "/workflows":
      return "Manage ComfyUI workflows";
    case "/settings":
      return "Configure backends and defaults";
    default:
      return "";
  }
}
