// Generates the app's celebration Lottie files into public/lottie/.
// Hand-authored as code (no third-party assets → no licensing questions).
// Run: node scripts/generate-lottie.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "lottie");
mkdirSync(OUT, { recursive: true });

const FR = 60;
const SIZE = 200;

// ---------------------------------------------------------------- helpers ---
const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
};
const still = (k) => ({ a: 0, k });
const EASE_OUT = { o: { x: [0.2], y: [0] }, i: { x: [0.2], y: [1] } };
const EASE_IN_OUT = { o: { x: [0.4], y: [0] }, i: { x: [0.4], y: [1] } };
/** Animated property from [[frame, value], ...]. */
const anim = (frames, ease = EASE_OUT) => ({
  a: 1,
  k: frames.map(([t, s], i) =>
    i === frames.length - 1
      ? { t, s: Array.isArray(s) ? s : [s] }
      : { t, s: Array.isArray(s) ? s : [s], ...ease },
  ),
});

const transform = ({ p = [SIZE / 2, SIZE / 2], s = [100, 100], r = 0, o = 100 } = {}) => ({
  o: typeof o === "object" ? o : still(o),
  r: typeof r === "object" ? r : still(r),
  p: Array.isArray(p) ? still([...p, 0]) : p,
  a: still([0, 0, 0]),
  s: Array.isArray(s) ? still([...s, 100]) : s,
});

const groupTransform = () => ({
  ty: "tr",
  p: still([0, 0]),
  a: still([0, 0]),
  s: still([100, 100]),
  r: still(0),
  o: still(100),
});

const fill = (hex) => ({ ty: "fl", c: still(rgb(hex)), o: still(100), r: 1 });
const stroke = (hex, w) => ({
  ty: "st",
  c: still(rgb(hex)),
  o: still(100),
  w: still(w),
  lc: 2,
  lj: 2,
});

const starShape = (outer, inner, points = 5) => ({
  ty: "sr",
  sy: 1,
  d: 1,
  pt: still(points),
  p: still([0, 0]),
  r: still(0),
  ir: still(inner),
  is: still(0),
  or: still(outer),
  os: still(0),
});
const ellipse = (w, h = w) => ({ ty: "el", d: 1, p: still([0, 0]), s: still([w, h]) });
const rect = (w, h, r) => ({ ty: "rc", d: 1, p: still([0, 0]), s: still([w, h]), r: still(r) });
const round = (r) => ({ ty: "rd", r: still(r) });

let ind = 0;
const layer = (nm, ks, shapes, ip = 0, op = 120) => ({
  ddd: 0,
  ind: ++ind,
  ty: 4,
  nm,
  sr: 1,
  ks,
  ao: 0,
  shapes: [{ ty: "gr", nm, it: [...shapes, groupTransform()] }],
  ip,
  op,
  st: 0,
  bm: 0,
});

const doc = (nm, op, layers) => ({
  v: "5.7.4",
  fr: FR,
  ip: 0,
  op,
  w: SIZE,
  h: SIZE,
  nm,
  ddd: 0,
  assets: [],
  layers,
});

/** Particles flying out from the centre and fading. */
function burst(count, { colors, dist = 70, start = 6, dur = 40, size = 10, shape = "dot", op }) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (i % 2 ? 0.2 : 0);
    const d = dist * (0.8 + ((i * 37) % 10) / 25);
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const to = [cx + Math.cos(angle) * d, cy + Math.sin(angle) * d, 0];
    const t0 = start + (i % 3);
    const geom =
      shape === "sparkle" ? [starShape(size, size * 0.35, 4), round(1)] : [ellipse(size)];
    return layer(
      `p${i}`,
      {
        o: anim([
          [t0, 0],
          [t0 + 4, 100],
          [t0 + dur * 0.6, 100],
          [t0 + dur, 0],
        ]),
        r: anim([
          [t0, 0],
          [t0 + dur, shape === "sparkle" ? 90 : 0],
        ]),
        p: anim(
          [
            [t0, [cx, cy, 0]],
            [t0 + dur, to],
          ],
          EASE_OUT,
        ),
        a: still([0, 0, 0]),
        s: anim([
          [t0, [40, 40, 100]],
          [t0 + 8, [110, 110, 100]],
          [t0 + dur, [60, 60, 100]],
        ]),
      },
      [...geom, fill(colors[i % colors.length])],
      0,
      op,
    );
  });
}

// --------------------------------------------------------- milestone-star ---
ind = 0;
{
  const op = 96;
  const star = layer(
    "star",
    transform({
      s: anim([
        [0, [0, 0, 100]],
        [14, [122, 122, 100]],
        [22, [94, 94, 100]],
        [30, [104, 104, 100]],
        [38, [100, 100, 100]],
        [80, [100, 100, 100]],
        [96, [96, 96, 100]],
      ]),
      r: anim([
        [0, -40],
        [22, 8],
        [38, 0],
      ]),
    }),
    [starShape(58, 26), round(9), fill("#ffd76a"), stroke("#e8a93a", 6)],
    0,
    op,
  );
  const shine = layer(
    "shine",
    transform({
      p: [SIZE / 2 - 14, SIZE / 2 - 16],
      o: anim([
        [18, 0],
        [26, 90],
        [70, 90],
        [90, 0],
      ]),
    }),
    [ellipse(14, 9), fill("#fff8e1")],
    0,
    op,
  );
  const halo = layer(
    "halo",
    transform({
      s: anim([
        [6, [40, 40, 100]],
        [40, [190, 190, 100]],
      ]),
      o: anim([
        [6, 70],
        [40, 0],
      ]),
    }),
    [ellipse(100), stroke("#ffd76a", 5)],
    0,
    op,
  );
  const particles = burst(10, {
    colors: ["#ffcf5c", "#9bd3c6", "#f6a6b2", "#b8b4f0"],
    dist: 84,
    start: 10,
    dur: 46,
    size: 9,
    shape: "sparkle",
    op,
  });
  // Lottie draws layers top-first.
  writeFileSync(
    join(OUT, "milestone-star.json"),
    JSON.stringify(doc("milestone-star", op, [shine, star, ...particles, halo])),
  );
}

// --------------------------------------------------------- growth-sparkle ---
ind = 0;
{
  const op = 100;
  const colors = ["#ffd76a", "#a7d8e8", "#f6b3bd", "#b9e3c6"];
  const spots = [
    [56, 70, 1.3, 0],
    [144, 58, 1, 8],
    [128, 142, 1.15, 14],
    [70, 140, 0.9, 20],
    [100, 40, 0.8, 26],
    [160, 108, 0.85, 4],
    [38, 106, 0.75, 18],
  ];
  const sparkles = spots.map(([x, y, k, t0], i) =>
    layer(
      `s${i}`,
      transform({
        p: [x, y],
        s: anim([
          [t0, [0, 0, 100]],
          [t0 + 12, [130 * k, 130 * k, 100]],
          [t0 + 22, [90 * k, 90 * k, 100]],
          [t0 + 48, [100 * k, 100 * k, 100]],
          [t0 + 64, [0, 0, 100]],
        ], EASE_IN_OUT),
        r: anim([
          [t0, 0],
          [t0 + 64, 120],
        ]),
      }),
      [starShape(14, 4, 4), round(2), fill(colors[i % colors.length])],
      0,
      op,
    ),
  );
  // A soft upward "ruler" swoosh: three rising dots.
  const rising = [0, 1, 2].map((i) =>
    layer(
      `up${i}`,
      transform({
        p: anim([
          [10 + i * 8, [100 + (i - 1) * 22, 150, 0]],
          [60 + i * 8, [100 + (i - 1) * 22, 70, 0]],
        ]),
        o: anim([
          [10 + i * 8, 0],
          [20 + i * 8, 100],
          [50 + i * 8, 100],
          [60 + i * 8, 0],
        ]),
      }),
      [ellipse(10), fill(colors[(i + 1) % colors.length])],
      0,
      op,
    ),
  );
  writeFileSync(
    join(OUT, "growth-sparkle.json"),
    JSON.stringify(doc("growth-sparkle", op, [...sparkles, ...rising])),
  );
}

// ---------------------------------------------------------- confetti-soft ---
ind = 0;
{
  const op = 110;
  const colors = ["#ffd76a", "#a7d8e8", "#f6b3bd", "#b9e3c6", "#c9c3f2", "#ffc49b"];
  const pieces = Array.from({ length: 22 }, (_, i) => {
    const x0 = SIZE / 2 + ((i * 29) % 40) - 20;
    const dx = (((i * 53) % 160) - 80) * 1.1;
    const peak = 30 + ((i * 17) % 40);
    const t0 = (i % 5) * 2;
    const spin = ((i * 71) % 2 ? 1 : -1) * (180 + ((i * 41) % 360));
    const isDot = i % 3 === 0;
    return layer(
      `c${i}`,
      {
        o: anim([
          [t0, 100],
          [op - 20, 100],
          [op, 0],
        ]),
        r: anim([
          [t0, 0],
          [op, spin],
        ], EASE_IN_OUT),
        p: {
          a: 1,
          k: [
            { t: t0, s: [x0, 120, 0], o: { x: [0.1], y: [0] }, i: { x: [0.3], y: [1] } },
            { t: t0 + 26, s: [x0 + dx * 0.6, peak, 0], o: { x: [0.4], y: [0] }, i: { x: [0.6], y: [1] } },
            { t: op, s: [x0 + dx, SIZE + 20, 0] },
          ],
        },
        a: still([0, 0, 0]),
        s: still([100, 100, 100]),
      },
      [isDot ? ellipse(8) : rect(7, 12, 2.5), fill(colors[i % colors.length])],
      0,
      op,
    );
  });
  writeFileSync(join(OUT, "confetti-soft.json"), JSON.stringify(doc("confetti-soft", op, pieces)));
}

console.log("Lottie files written to", OUT);
