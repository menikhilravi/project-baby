/**
 * Maps free-text user input ("whole foods", "uber eats") to canonical
 * categories that match `card_categories.category` values.
 */

export const CANONICAL_CATEGORIES = [
  "dining",
  "groceries",
  "online_groceries",
  "gas",
  "travel",
  "flights",
  "hotels",
  "streaming",
  "drugstores",
  "transit",
  "amazon",
  "apple",
] as const;

export type Category = (typeof CANONICAL_CATEGORIES)[number];

/**
 * Keyword → canonical category. Matched as case-insensitive substring.
 * Order matters slightly: more specific keys first within a row.
 */
const KEYWORD_RULES: Array<[Category, string[]]> = [
  ["dining", [
    "dining", "restaurant", "cafe", "coffee", "starbucks", "chipotle",
    "uber eats", "doordash", "grubhub", "seamless", "pizza", "sushi",
    "takeout", "bar", "brewery",
  ]],
  ["online_groceries", [
    "instacart", "online groceries", "online grocer", "amazon fresh",
    "whole foods online",
  ]],
  ["groceries", [
    "groceries", "grocery", "whole foods", "trader joe", "trader joes",
    "kroger", "safeway", "albertsons", "publix", "wegmans", "food lion",
    "supermarket", "h-e-b", "heb",
  ]],
  ["gas", [
    "gas", "shell", "exxon", "chevron", "bp", "fuel", "pump", "gasoline",
    "mobil", "76", "arco", "valero",
  ]],
  ["flights", [
    "flight", "airline", "delta", "united", "american airlines", "southwest",
    "jetblue", "alaska airlines", "frontier", "spirit air",
  ]],
  ["hotels", [
    "hotel", "marriott", "hilton", "hyatt", "ihg", "airbnb", "booking.com",
    "vrbo",
  ]],
  ["travel", [
    "travel", "uber", "lyft", "rental car", "expedia", "kayak", "rail",
    "train", "amtrak",
  ]],
  ["transit", [
    "transit", "subway pass", "metro", "bus", "mta", "metrocard", "wmata",
    "muni", "bart",
  ]],
  ["streaming", [
    "streaming", "netflix", "hulu", "disney+", "spotify", "apple music",
    "youtube premium", "hbo", "max", "paramount+", "peacock",
  ]],
  ["drugstores", [
    "drugstore", "pharmacy", "cvs", "walgreens", "rite aid", "duane reade",
  ]],
  ["amazon", [
    "amazon", "whole foods market", "audible", "amazon prime",
  ]],
  ["apple", [
    "apple", "apple store", "app store", "icloud", "apple tv",
  ]],
];

export function normalizeCategory(input: string): Category | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;
  for (const [cat, keywords] of KEYWORD_RULES) {
    if (keywords.some((kw) => q.includes(kw))) return cat;
  }
  return null;
}
