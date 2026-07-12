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

---

## Baby Mode — Newborn Health (Tier 1)

Grounded against AAP / HealthyChildren / CHOP newborn norms. All built on the
existing `baby_events` table (migration `0025_baby_events_health.sql`).

### 🚧 BH-1 · Temperature + age-gated fever alert
**Status:** Built. New `kind='temp'` (amount + °F/°C). Log from the Temp button
in the health quick-log on /log and /today. `src/lib/newborn-health.ts` holds
the thresholds (fever ≥100.4°F/38°C, low ≤97°F). `FeverAlertCard` on /today
shows an **urgent** banner when a <3-month-old has a fever (or any low reading),
milder heads-up otherwise; renders nothing for a normal/stale reading. Not
medical advice — always points to the pediatrician.

### 🚧 BH-2 · Diaper-output adequacy card
**Status:** Built. `DiaperAdequacyCard` on /today rolls today's pee/poop taps
into wet/dirty vs the age-appropriate target (first-week day-by-day ramp, then
≥6 wet / ≥3 dirty). Reassuring "building → on track", never an alarm. Shown
through ~12 weeks. Pure logic in `newborn-health.ts` (`diaperGuidance`,
`tallyDiapers`) — no schema change.

### 🚧 BH-3 · Nursing timer + "which side next"
**Status:** Built. Tapping Left/Right in the feed picker now starts a **timed**
nursing session (occurred_at = latch, ended_at = unlatch) with a live banner
(switch side / stop). Feed picker + banner suggest the next side from the last
session. Bottle/solid stay instant. Migration backfills existing instant feeds
to `ended_at = occurred_at` so `ended_at IS NULL` cleanly means "in progress";
a partial unique index guarantees one open session per couple/solo.

### 🚧 BH-4 · Time-since-last-feed nudge
**Status:** Mostly pre-existing — the Today last-events row already shows live
"Xh Ym ago" per event. Nursing sessions now feed into it. (A target-interval
"due soon" nudge is the remaining polish — deferred.)

### 🚧 BH-5 · Meds & Vitamin-D log
**Status:** Built. New `kind='med'` (subtype = vitamin_d/tylenol/gas_drops/
probiotic/other, optional dose). Medicine button in the health quick-log;
`MedsCard` on /today gives a one-tap daily Vitamin-D check (400 IU) and a
last-24h "what was given, when" list so partners don't double-dose. Logging
only — no dosing advice.

### ⚠️ Deploy step (required before these work end-to-end)
`0025_baby_events_health.sql` must be applied to Supabase (it extends the
`kind`/`subtype`/`unit` checks and **backfills feed `ended_at`**). Until then,
reads return empty and health/nursing **inserts fail the kind check**. Verified
locally: `tsc`, `eslint`, and `next build` all clean; runtime not exercised
(needs the migration + an authed session).

---

## Baby Mode — Tier 2 (product wins) + Tier 3 (bug fixes)

Migrations `0026_profiles_baby.sql` (profiles.`baby_sex`, `birth_weight_g`) and
`0027_baby_events_activities.sql` (kinds `pump`/`tummy`/`milestone`).

### 🚧 BH-6 · Birth-weight recovery (T2)
`BirthWeightCard` on /reports plots each weigh-in as a % of birth weight, with
the 100% line and the day-14 marker, and a plain-language status (regained by
day N / still below after day 14 / normal dip). Needs birth weight + birth date
(both now in Settings). WHO percentiles don't surface this first-2-week concern.

### 🚧 BH-7 · Newborn nap gap filled (T2)
`wake-window.ts` now has newborn baselines (<4wk ≈ 50 min, 4–8wk ≈ 70) and the
gate dropped from 8 weeks to 2, so the hardest weeks get a low-confidence window
instead of a blank card.

### 🚧 BH-8 · Bottle intake oz/day (T2)
`baby-stats` sums feed `amount` (ml→oz) into `feedOz`; the Reports feeds card
shows "X oz/day bottle" when there's bottle data.

### 🚧 BH-9 · Pumping + tummy time (T2)
Health quick-log gains **Pump** (oz + side) and **Tummy** (minute chips). New
`kind='pump'`/`'tummy'`; both render in the timeline. `TummyTimeCard` on /today
totals today's tummy minutes vs a gentle ~30-min goal (shown through ~6 months).

### 🚧 BH-10 · Milestones (T2)
`kind='milestone'` (label in notes). `MilestonesCard` on /reports adds/lists
"firsts". Actions `addMilestone`/`removeMilestone` in `growth-actions`.

### 🚧 BH-11 · Overnight sleep split (T3 bug)
`baby-stats.dayBuckets` used to dump a whole overnight stretch on its start day.
Now sleep **hours** split at local midnight across each day covered; session
count + longest-stretch still land on the start day (so the "longest stretch"
headline is preserved).

### 🚧 BH-12 · Baby sex → profile (T3 bug)
Was per-device `localStorage`; now `profiles.baby_sex`, couple/device-shared and
editable in Settings and from the Growth card's Boy/Girl toggle (`setBabySex`).

### ⚠️ Deploy step
Apply `0026` and `0027` to Supabase before these work (they extend the `kind`
check and add profile columns). Verified locally: `tsc`, `eslint` (changed
files), and `next build` all clean; runtime not exercised (needs migrations +
an authed session). Pre-existing lint errors in `name-deck.tsx` /
`nav-progress.tsx` are untouched and unrelated.
