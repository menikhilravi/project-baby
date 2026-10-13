import { BabyMascot } from "@/components/mascot/baby-mascot";

// Mirrors Today's layout (hero, rings, tiles) so the swap doesn't jump.
export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4 pb-10 md:px-8 md:py-12" aria-busy="true">
      <div className="flex items-center gap-3 rounded-[2rem] bg-accent-baby-soft px-5 py-5">
        <div className="flex-1 space-y-2.5">
          <div className="h-3 w-28 rounded-full bg-muted animate-pulse" />
          <div className="h-7 w-48 rounded-full bg-muted animate-pulse" />
          <div className="h-3.5 w-36 rounded-full bg-muted animate-pulse" />
        </div>
        <BabyMascot mood="sleeping" size={112} className="-my-2 -mr-1 opacity-70" />
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[10.5rem] rounded-tile bg-muted animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[8.5rem] rounded-tile bg-muted animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[4.75rem] rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
      <div className="h-28 rounded-card bg-muted animate-pulse" />
    </div>
  );
}
