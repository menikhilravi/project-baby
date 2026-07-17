export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10 md:px-8 md:py-16">
      <div className="flex items-start gap-3.5 mb-6">
        <div className="h-11 w-11 rounded-2xl bg-muted animate-pulse shrink-0" />
        <div className="space-y-2 pt-1">
          <div className="h-3 w-16 rounded bg-muted animate-pulse" />
          <div className="h-7 w-56 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="space-y-5">
        <div className="h-40 rounded-3xl bg-muted animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-10 rounded-xl bg-muted animate-pulse" />
            <div className="h-10 rounded-xl bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
