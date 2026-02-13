import { notFound } from "next/navigation";
import { getGeneration } from "@/lib/db/generations";
import { MediaViewer } from "@/components/gallery/media-viewer";

export default async function GenerationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const generation = getGeneration(id);

  if (!generation) {
    notFound();
  }

  return <MediaViewer generation={generation} />;
}
