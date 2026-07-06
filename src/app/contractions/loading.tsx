export default function Loading() {
  return (
    <div className="mx-auto max-w-xl px-5 py-10 md:px-8 md:py-16">
      <div className="flex items-start gap-3.5 mb-8">
        <div className="h-11 w-11 rounded-2xl bg-muted animate-pulse shrink-0" />
        <div className="space-y-2 pt-1">
          <div className="h-3 w-20 rounded bg-muted animate-pulse" />
          <div className="h-7 w-52 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-6">
        <div className="aspect-square w-full max-w-[20rem] rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-56 rounded bg-muted animate-pulse" />
      </div>
      <div className="mt-10 h-28 rounded-2xl bg-muted animate-pulse" />
      <div className="mt-6 h-40 rounded-2xl bg-muted animate-pulse" />
    </div>
  );
}
