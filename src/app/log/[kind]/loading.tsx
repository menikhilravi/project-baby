export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-10 md:px-8 md:py-12" aria-busy="true">
      <div className="mb-3 h-10 w-24 rounded-full bg-muted animate-pulse" />
      <div className="mb-8 flex items-start gap-4">
        <div className="h-12 w-12 shrink-0 rounded-[1.15rem] bg-muted animate-pulse" />
        <div className="flex-1 space-y-2.5 pt-1">
          <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
          <div className="h-8 w-56 rounded-full bg-muted animate-pulse" />
          <div className="h-3.5 w-64 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[4.5rem] rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-52 rounded-card bg-muted animate-pulse" />
        <div className="h-64 rounded-card bg-muted animate-pulse" />
      </div>
    </div>
  );
}
