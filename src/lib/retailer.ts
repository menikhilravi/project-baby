/**
 * Maps a product URL's hostname → friendly retailer name.
 * Falls back to a Title-Cased version of the apex domain.
 */

const KNOWN_RETAILERS: Array<[RegExp, string]> = [
  [/(^|\.)amazon\./i, "Amazon"],
  [/(^|\.)target\.com/i, "Target"],
  [/(^|\.)walmart\.com/i, "Walmart"],
  [/(^|\.)babylist\.com/i, "Babylist"],
  [/(^|\.)buybuybaby\.com/i, "Buy Buy Baby"],
  [/(^|\.)potterybarnkids\.com/i, "Pottery Barn Kids"],
  [/(^|\.)nordstrom\.com/i, "Nordstrom"],
  [/(^|\.)crateandbarrel\.com|crateandkids\.com/i, "Crate & Kids"],
  [/(^|\.)happiestbaby\.com/i, "Happiest Baby"],
  [/(^|\.)nuna(usa)?\.com/i, "Nuna"],
  [/(^|\.)uppababy\.com/i, "UPPAbaby"],
  [/(^|\.)maxi-cosi\.com/i, "Maxi-Cosi"],
  [/(^|\.)4moms\.com/i, "4moms"],
  [/(^|\.)graco(baby)?\.com/i, "Graco"],
  [/(^|\.)chicco(usa)?\.com/i, "Chicco"],
  [/(^|\.)bobgear\.com/i, "BOB Gear"],
  [/(^|\.)maclaren(baby)?\.com/i, "Maclaren"],
  [/(^|\.)bumbleride\.com/i, "Bumbleride"],
  [/(^|\.)stokke\.com/i, "Stokke" ],
  [/(^|\.)bugaboo\.com/i, "Bugaboo"],
  [/(^|\.)ergobaby\.com/i, "Ergobaby"],
  [/(^|\.)pottery\s*barn|potterybarn\.com/i, "Pottery Barn"],
  [/(^|\.)westelm\.com/i, "West Elm"],
  [/(^|\.)costco\.com/i, "Costco"],
  [/(^|\.)bestbuy\.com/i, "Best Buy"],
  [/(^|\.)kohls\.com/i, "Kohl's"],
  [/(^|\.)macys\.com/i, "Macy's"],
];

export function detectRetailer(url: string): string {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return "Unknown";
  }
  for (const [re, name] of KNOWN_RETAILERS) {
    if (re.test(host)) return name;
  }
  // Fallback: take apex domain, strip www, title-case.
  const apex = host.replace(/^www\./i, "").split(".")[0];
  return apex.charAt(0).toUpperCase() + apex.slice(1);
}

/** Hosts that block scrapers and can't be reliably auto-tracked yet. */
export function isHostileHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return /(^|\.)(amazon\.|walmart\.com)/.test(host);
  } catch {
    return false;
  }
}
