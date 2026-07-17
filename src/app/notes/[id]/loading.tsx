export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10 md:px-8 md:py-16">
      <div className="flex items-start gap-3.5 mb-6">
        <div className="h-11 w-11 rounded-2xl bg-muted animate-pulse shrink-0" />
        <div className="space-y-2 pt-1">
          <div className="h-3 w-16 rounded bg-muted animate-pulse" />
          <div className="h-7 w-48 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-5 w-full rounded bg-muted animate-pulse" />
        <div className="h-5 w-5/6 rounded bg-muted animate-pulse" />
        <div className="h-5 w-2/3 rounded bg-muted animate-pulse" />
      </div>
    </div>
  );
}
