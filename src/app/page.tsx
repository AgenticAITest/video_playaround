import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Image,
  Film,
  PlayCircle,
  Workflow,
  LayoutGrid,
  Activity,
} from "lucide-react";
import { countGenerations } from "@/lib/db/generations";
import { listWorkflows } from "@/lib/db/workflows";
import { listGenerations } from "@/lib/db/generations";
import { formatDate, truncate } from "@/lib/utils";
import { DashboardStatus } from "@/components/layout/dashboard-status";

const quickLinks = [
  {
    href: "/text-to-image",
    title: "Text to Image",
    description: "Generate images from text descriptions",
    icon: Image,
  },
  {
    href: "/text-to-video",
    title: "Text to Video",
    description: "Generate videos from text descriptions",
    icon: Film,
  },
  {
    href: "/image-to-video",
    title: "Image to Video",
    description: "Animate images into videos",
    icon: PlayCircle,
  },
  {
    href: "/workflows",
    title: "Manage Workflows",
    description: "Upload and configure ComfyUI workflows",
    icon: Workflow,
  },
];

export const dynamic = "force-dynamic";

export default function HomePage() {
  const totalGenerations = countGenerations();
  const txt2imgCount = countGenerations("text-to-image");
  const txt2vidCount = countGenerations("text-to-video");
  const img2vidCount = countGenerations("image-to-video");
  const workflows = listWorkflows();
  const recentGenerations = listGenerations({ limit: 6 });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome to MediaGen
        </h2>
        <p className="mt-2 text-muted-foreground">
          AI-powered image and video generation using ComfyUI and LM Studio.
        </p>
      </div>

      {/* Connection status */}
      <DashboardStatus />

      {/* Quick links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Card className="transition-colors hover:border-primary/50 hover:bg-accent/50">
                <CardHeader>
                  <Icon className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle className="text-base">{link.title}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalGenerations}</p>
              <p className="text-xs text-muted-foreground">
                Total Generations
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Image className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{txt2imgCount}</p>
              <p className="text-xs text-muted-foreground">Images</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Film className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {txt2vidCount + img2vidCount}
              </p>
              <p className="text-xs text-muted-foreground">Videos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Workflow className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{workflows.length}</p>
              <p className="text-xs text-muted-foreground">Workflows</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Generations */}
      {recentGenerations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Recent Generations</h3>
            <Link
              href="/gallery"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recentGenerations.map((gen) => (
              <Link key={gen.id} href={`/gallery/${gen.id}`}>
                <Card className="transition-colors hover:bg-accent/30">
                  <CardContent className="flex items-start gap-3 pt-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10">
                      {gen.mode === "text-to-image" ? (
                        <Image className="h-4 w-4 text-primary" />
                      ) : gen.mode === "text-to-video" ? (
                        <Film className="h-4 w-4 text-primary" />
                      ) : (
                        <PlayCircle className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug line-clamp-2">
                        {truncate(gen.originalPrompt, 100)}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {gen.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(gen.createdAt)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
