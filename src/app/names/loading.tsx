export default function Loading() {
  return (
    <div className="mx-auto max-w-md px-4 py-8 md:py-12 flex flex-col items-center">
      <div className="w-full mb-6">
        <div className="flex items-start gap-3.5 mb-6">
          <div className="h-11 w-11 rounded-2xl bg-muted animate-pulse shrink-0" />
          <div className="space-y-2 pt-1">
            <div className="h-3 w-16 rounded bg-muted animate-pulse" />
            <div className="h-7 w-48 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
      <div className="w-full max-w-xs aspect-[3/4] rounded-3xl bg-muted animate-pulse" />
      <div className="mt-10 flex items-center gap-8">
        <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
        <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
      </div>
    </div>
  );
}
