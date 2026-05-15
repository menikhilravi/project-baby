export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-12">
      <div className="flex items-start gap-3.5 mb-6">
        <div className="h-11 w-11 rounded-2xl bg-muted animate-pulse shrink-0" />
        <div className="space-y-2 pt-1">
          <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          <div className="h-7 w-44 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-6">
        <div className="aspect-square w-full max-w-[18rem] rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-48 rounded bg-muted animate-pulse" />
        <div className="h-7 w-28 rounded-full bg-muted animate-pulse" />
      </div>
      <div className="mt-8 h-40 rounded-2xl bg-muted animate-pulse" />
    </div>
  );
}
