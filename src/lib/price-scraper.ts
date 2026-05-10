import * as cheerio from "cheerio";
import { isHostileHost } from "./retailer";

export type ScrapeResult =
  | {
      ok: true;
      price: number;
      currency: string;
      title?: string;
      image?: string;
    }
  | { ok: false; error: string };

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 " +
  "(KHTML, like Gecko) Version/17.5 Safari/605.1.15";

export async function scrapePrice(url: string): Promise<ScrapeResult> {
  if (isHostileHost(url)) {
    return {
      ok: false,
      error:
        "This retailer blocks automatic price tracking. Set the price manually for now.",
    };
  }

  let html: string;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      return { ok: false, error: `Got HTTP ${res.status} from retailer` };
    }
    html = await res.text();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Fetch failed: ${msg}` };
  }

  // 1. JSON-LD: walk every <script type="application/ld+json"> for a Product.
  const $ = cheerio.load(html);
  const jsonLd = extractFromJsonLd($);
  if (jsonLd) return { ok: true, ...jsonLd };

  // 2. OpenGraph / product meta tags.
  const og = extractFromMeta($);
  if (og) return { ok: true, ...og };

  // 3. Fallback: regex over raw HTML for Product+price (catches RSC-payload
  //    JSON-LD on Next.js sites where the script tag is set via
  //    dangerouslySetInnerHTML and isn't visible to cheerio.
  const fromRaw = extractFromRawHtml(html);
  if (fromRaw) return { ok: true, ...fromRaw };

  return {
    ok: false,
    error: "No price markup found on the page.",
  };
}

// ---------------------------------------------------------------------------
// JSON-LD
// ---------------------------------------------------------------------------

type Found = { price: number; currency: string; title?: string; image?: string };

function extractFromJsonLd($: cheerio.CheerioAPI): Found | null {
  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i++) {
    const raw = $(scripts[i]).contents().text().trim();
    if (!raw) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Some retailers ship invalid JSON-LD with HTML entities; skip gracefully.
      continue;
    }
    const found = walkForProduct(parsed);
    if (found) return found;
  }
  return null;
}

function walkForProduct(node: unknown): Found | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const f = walkForProduct(item);
      if (f) return f;
    }
    return null;
  }
  if (typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;

  // Some sites put the product inside @graph
  if (Array.isArray(obj["@graph"])) {
    const f = walkForProduct(obj["@graph"]);
    if (f) return f;
  }

  const t = obj["@type"];
  const isProduct =
    t === "Product" ||
    (Array.isArray(t) && t.includes("Product"));

  if (isProduct) {
    const offers = obj["offers"];
    const offer = pickOffer(offers);
    if (offer) {
      const price = parsePrice(offer.price);
      if (price !== null) {
        return {
          price,
          currency: offer.currency ?? "USD",
          title: typeof obj.name === "string" ? obj.name : undefined,
          image: pickImage(obj.image),
        };
      }
    }
  }

  return null;
}

type ParsedOffer = { price: unknown; currency?: string };

function pickOffer(offers: unknown): ParsedOffer | null {
  if (!offers) return null;
  if (Array.isArray(offers)) {
    // Pick the cheapest offer with a numeric price.
    let best: ParsedOffer | null = null;
    let bestPrice = Infinity;
    for (const o of offers) {
      const p = pickOffer(o);
      if (!p) continue;
      const n = parsePrice(p.price);
      if (n !== null && n < bestPrice) {
        best = p;
        bestPrice = n;
      }
    }
    return best;
  }
  if (typeof offers !== "object") return null;
  const o = offers as Record<string, unknown>;
  // AggregateOffer has lowPrice + priceCurrency
  if (o["@type"] === "AggregateOffer" && o.lowPrice !== undefined) {
    return {
      price: o.lowPrice,
      currency: typeof o.priceCurrency === "string" ? o.priceCurrency : undefined,
    };
  }
  if (o.price !== undefined) {
    return {
      price: o.price,
      currency: typeof o.priceCurrency === "string" ? o.priceCurrency : undefined,
    };
  }
  return null;
}

function pickImage(image: unknown): string | undefined {
  if (typeof image === "string") return image;
  if (Array.isArray(image) && typeof image[0] === "string") return image[0];
  if (image && typeof image === "object") {
    const url = (image as Record<string, unknown>).url;
    if (typeof url === "string") return url;
  }
  return undefined;
}

function parsePrice(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[^0-9.,-]/g, "").replace(/,(?=\d{3}\b)/g, "");
    const n = parseFloat(cleaned.replace(",", "."));
    if (Number.isFinite(n) && n > 0) return Math.round(n * 100) / 100;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Raw-HTML fallback (RSC-wrapped JSON-LD)
// ---------------------------------------------------------------------------

/**
 * Some sites (Next.js RSC, framework wrappers) emit JSON-LD via
 * `dangerouslySetInnerHTML`, which means the script tag's inner text isn't
 * visible to cheerio — the data lives inside an escaped JSON string in an RSC
 * chunk. Cheaper than running a headless browser: regex search for a
 * "Product" mention followed by a price field, at any nesting depth of JSON
 * escaping.
 */
function extractFromRawHtml(html: string): Found | null {
  // RSC payloads can JSON-encode the data 1, 2, or 3 levels deep, producing
  // anywhere from 1 to many literal backslashes per quote. Easier than
  // hand-rolling four escape variants: strip all backslashes, then look for
  // the canonical pattern.
  const flat = html.replace(/\\/g, "");

  const m = flat.match(
    /"@type"\s*:\s*"Product"[\s\S]{0,8000}?"price"\s*:\s*"?([\d.,]+)"?/,
  );
  if (m) {
    const price = parsePrice(m[1]);
    if (price !== null) return { price, currency: "USD" };
  }

  // lowPrice variant for AggregateOffer
  const lp = flat.match(
    /"@type"\s*:\s*"Product"[\s\S]{0,8000}?"lowPrice"\s*:\s*"?([\d.,]+)"?/,
  );
  if (lp) {
    const price = parsePrice(lp[1]);
    if (price !== null) return { price, currency: "USD" };
  }

  return null;
}

// ---------------------------------------------------------------------------
// OpenGraph / product meta
// ---------------------------------------------------------------------------

function extractFromMeta($: cheerio.CheerioAPI): Found | null {
  const candidates = [
    'meta[property="og:price:amount"]',
    'meta[property="product:price:amount"]',
    'meta[name="og:price:amount"]',
    'meta[name="twitter:data1"]',
  ];

  for (const sel of candidates) {
    const value = $(sel).attr("content");
    const price = parsePrice(value);
    if (price !== null) {
      const currency =
        $('meta[property="og:price:currency"]').attr("content") ??
        $('meta[property="product:price:currency"]').attr("content") ??
        "USD";
      const title =
        $('meta[property="og:title"]').attr("content") ??
        $("title").text() ??
        undefined;
      const image = $('meta[property="og:image"]').attr("content") ?? undefined;
      return { price, currency, title, image };
    }
  }

  return null;
}
