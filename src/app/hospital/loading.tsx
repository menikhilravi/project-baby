export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-12">
      <div className="flex items-start gap-3.5 mb-6">
        <div className="h-11 w-11 rounded-2xl bg-muted animate-pulse shrink-0" />
        <div className="space-y-2 pt-1">
          <div className="h-3 w-14 rounded bg-muted animate-pulse" />
          <div className="h-7 w-44 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="h-14 rounded-2xl bg-muted animate-pulse mb-4" />
      <div className="h-12 rounded-2xl bg-muted animate-pulse mb-4" />
      <div className="space-y-2.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}
