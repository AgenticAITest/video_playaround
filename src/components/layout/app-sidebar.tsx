"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NextImage from "next/image";
import {
  Home,
  Image,
  Film,
  PlayCircle,
  LayoutGrid,
  Workflow,
  Settings,
  ChevronLeft,
  Music,
  ImagePlus,
  Disc3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/text-to-image", label: "Text to Image", icon: Image },
  { href: "/image-to-image", label: "Image to Image", icon: ImagePlus },
  { href: "/text-to-video", label: "Text to Video", icon: Film },
  { href: "/image-to-video", label: "Image to Video", icon: PlayCircle },
  { href: "/text-to-music", label: "Text to Music", icon: Music },
  { href: "/music-to-music", label: "Music to Music", icon: Disc3 },
  { href: "/gallery", label: "Gallery", icon: LayoutGrid },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-3">
        <NextImage
          src="/logo.png"
          alt="Nimbus MediaGen"
          width={44}
          height={44}
          className="shrink-0 rounded-md"
        />
        {!collapsed && (
          <span className="text-lg font-semibold tracking-tight">
            Nimbus <span className="text-primary">MediaGen</span>
          </span>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          const linkContent = (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}
      </nav>

      <Separator />

      {/* Collapse toggle */}
      <div className="p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center"
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
          {!collapsed && <span className="ml-2">Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}
