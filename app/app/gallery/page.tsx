import { ImageIcon, PlusIcon } from "@/components/icons";
import { galleryItems } from "@/lib/mock-data";

export default function GalleryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl mb-1">Gallery</h1>
          <p className="text-sm text-muted">Photos and memories, tagged to a pet or habitat</p>
        </div>
        <button className="inline-flex items-center gap-2 text-sm font-semibold bg-accent text-accent-ink px-4 py-2.5 rounded-lg hover:brightness-95 transition">
          <PlusIcon className="w-[.9em] h-[.9em]" />
          Upload photo
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {galleryItems.map((item) => (
          <div key={item.id} className="flex flex-col gap-2">
            <div
              className="aspect-square rounded-[10px] border border-line flex items-center justify-center"
              style={{ background: `color-mix(in srgb, ${item.color} 16%, var(--surface))` }}
            >
              <ImageIcon className="text-2xl" style={{ color: item.color }} />
            </div>
            <div className="text-xs font-medium truncate">{item.caption}</div>
            <div className="text-[.68rem] text-muted truncate">{item.pet}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
