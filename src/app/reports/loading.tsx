export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-10 md:px-8 md:py-12" aria-busy="true">
      <div className="mb-8 flex items-start gap-4">
        <div className="h-12 w-12 shrink-0 rounded-[1.15rem] bg-muted animate-pulse" />
        <div className="flex-1 space-y-2.5 pt-1">
          <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
          <div className="h-8 w-60 rounded-full bg-muted animate-pulse" />
          <div className="h-3.5 w-72 rounded-full bg-muted animate-pulse" />
        </div>
      </div>
      <div className="space-y-5">
        <div className="h-[34rem] rounded-card bg-muted animate-pulse" />
        <div className="h-10 rounded-full bg-muted animate-pulse" />
        <div className="h-64 rounded-card bg-muted animate-pulse" />
      </div>
    </div>
  );
}
