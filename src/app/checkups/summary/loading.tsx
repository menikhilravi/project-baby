export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10 md:px-8 md:py-16">
      <div className="mb-6 flex items-start gap-3.5">
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-2xl bg-muted" />
        <div className="space-y-2 pt-1">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-7 w-60 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="space-y-5">
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
