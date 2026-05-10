# Parent Prep Hub — Backlog

Post-launch improvements. New items get appended; tags: `📋 Captured` → `🚧 In progress` → `✅ Done`.

---

## Price Pulse

### ⏸ PP-1 · Real-world price data + alerts when price changes
**Status:** Attempted with free JSON-LD parsing; landed but **not viable for v1**. Modern retailers (Babylist, Target, Pottery Barn Kids, Buy Buy Baby, Nordstrom, UPPAbaby direct) hydrate price markup client-side — server-rendered HTML has no structured data. The scraper only succeeded on a few Next.js-RSC sites like Happiest Baby. Reverting to manual entry as the primary path.
**To revisit:** integrate **ScrapingBee** or **ScraperAPI** (~$30–49/mo) for JS rendering, or **Keepa** ($19/mo) for Amazon-specific. Code skeleton (scraper, cron, target-hit transitions) is already in the repo — only the data source needs swapping.
**Effort to revisit:** ★★ (most plumbing exists)

### ✅ PP-2 · Track each item across many retailers
**Status:** Shipped. Schema is `gear_items` + `gear_watchers` (one item → many retailer URLs) + `gear_price_history` per watcher. UI shows best-price across watchers, expandable watchers list, "Add another retailer", manual price edit per watcher, target-hit banner.
**Reality:** because PP-1 is paused, watcher prices are user-entered manually rather than scraped. The multi-retailer + best-price-tracking value is intact.

---

## Name Bracket

### 📋 NB-1 · Couple mode — shared pool, both selections visible
**What:** Both partners see the **same** names; dashboard highlights names **both** liked.
**Why:** This is the actual goal of the tool — finding names *both* of you love.
**Schema impact:** new `households` table (or `couples`); `profiles` gets `household_id`. Pool reads filter "names neither has swiped" instead of per-user. New `/names/dashboard` view: a 2-column grid showing each partner's verdict per name, with "❤❤ Both liked" highlighted at the top.
**Effort:** ★★★

### 📋 NB-2 · Reorder / rank favorites
**What:** Drag-and-drop (or up/down) to order liked names. Top of the list = top contender.
**Why:** Right now favorites are an unordered flat list — useless once you have 30 of them.
**Schema impact:** `name_swipes.rank` nullable column, only set on liked rows.
**Effort:** ★★

### 📋 NB-3 · South Indian / Telugu name pool (gender-neutral mix)
**What:** Replace the current Western-leaning pool with Telugu-first names. Both boy and girl names since gender unknown.
**Why:** Current pool doesn't match the household.
**Approach:** start with a hand-curated ~150-name list (name + meaning + origin field set to "Telugu"). Optionally show the Telugu script alongside the romanization.
**Schema impact:** none (just swap `src/data/names.ts`). If mixing pools later, add a `culture` field.
**Effort:** ★★ (mostly data work)

### 📋 NB-4 · LLM-powered smart name engine (Gemini / Claude)
**What:** When the deck runs out, generate fresh Telugu names via LLM. Never repeat. Bias toward names similar to ones you've liked.
**Why:** Any static pool runs out; the LLM lets us iterate forever and learn from preferences.
**Approach:**
- Server action calls Gemini (or Claude — already in our toolkit) with: `{ liked: [...], passed: [...], already_seen: [...], count: 20, vibe: "Telugu, gender-neutral" }`.
- Generated names get cached in a new `name_pool` table (`name`, `meaning`, `origin`, `source: 'curated' | 'generated'`, `created_at`) so re-renders are instant and we don't pay per swipe.
- "Refresh deck" button when pool runs low.
**Cost:** ~$0.001 per 20-name batch — negligible.
**Effort:** ★★★

---

## More _(open — user will append)_

- _(awaiting next batch from you)_

---

## Pairings worth noting

- ~~**PP-1 + PP-2** ship together~~ — Tried; PP-1 paused (see status above). PP-2 shipped with manual entry per watcher.
- **NB-3 + NB-4** ship together — curated Telugu names seed the pool, LLM extends it. Doing only NB-4 with a Western prompt would be the wrong default.
- **NB-1** can ship independently and unlocks the most product value (couple mode is the actual core loop).
- **NB-2** is small and standalone — can slot in any time as a polish item.
