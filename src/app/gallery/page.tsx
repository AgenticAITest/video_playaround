import { GalleryGrid } from "@/components/gallery/gallery-grid";

export default function GalleryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Gallery</h2>
        <p className="text-muted-foreground">
          Browse your past generations
        </p>
      </div>
      <GalleryGrid />
    </div>
  );
}
