type Point = { price: number; recorded_at: string };

export function PriceHistorySparkline({
  points,
  goodTime,
}: {
  points: Point[];
  goodTime: boolean;
}) {
  if (points.length < 2) {
    return (
      <p className="text-[10.5px] uppercase tracking-wider text-muted-foreground/70">
        Update the price a few times to see history
      </p>
    );
  }

  const W = 240;
  const H = 36;
  const padX = 2;
  const padY = 4;

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(max - min, 1);

  const xs = points.map((_, i) =>
    points.length === 1
      ? W / 2
      : padX + (i * (W - padX * 2)) / (points.length - 1),
  );
  const ys = prices.map(
    (p) => padY + ((max - p) / range) * (H - padY * 2),
  );

  const linePath = xs
    .map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i].toFixed(1)}`)
    .join(" ");

  const lastX = xs[xs.length - 1];
  const lastY = ys[ys.length - 1];

  const stroke = goodTime ? "var(--hospital)" : "var(--gear)";
  const fill = goodTime ? "var(--hospital-soft)" : "var(--gear-soft)";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      className="block"
      aria-hidden
    >
      <path
        d={`${linePath} L ${lastX} ${H} L ${xs[0]} ${H} Z`}
        fill={fill}
        opacity={0.5}
      />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r={2.5} fill={stroke} />
    </svg>
  );
}
