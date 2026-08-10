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

### 🚧 BH-13 · Feed/diaper care reminders + richer metrics
**What:** Opt-in push nudges for feeds (adaptive interval from recent feeds) and
diapers (once-a-day if output is below the age target), couple-wide, quiet hours
6am–10pm. Plus richer feed/diaper metrics on the `/log/feed` · `/log/diaper`
detail pages (next-feed prediction, adequacy, 7-day charts) and Reports sublines.
**Built on:** existing push pipeline (`push.ts`, `push_subscriptions`, `sw.js`),
new `src/lib/care-schedule.ts` (shared by cron + UI), `newborn-health.ts` targets.
**Schema:** `0028_care_reminders.sql` — `profiles.{feed_reminders,diaper_reminders,
feed_interval_min}` + `care_reminder_state` (de-dup: once per gap / once per day).
**Scheduler:** Supabase **pg_cron + pg_net** (not GitHub Actions) hitting
`/api/cron/care-reminder` every ~20m — setup SQL is in the migration footer.
**⚠️ Deploy:** apply `0028`; enable `pg_cron`/`pg_net` + `alter database … set
app.cron_secret`; schedule the job; ensure `VAPID` keys + `CRON_SECRET` are set.
Metrics are verifiable locally; reminder runtime needs the migration + pg_cron +
an authed subscribed device.
**Effort:** ★★ (mostly plumbing that already existed)

### 🚧 BH-15 · Pediatrician visit summary
**What:** `/checkups/summary` — pick a **last visit** and **next visit** date and
get everything in between as the numbers a pediatrician actually asks for.
Reached from a card at the top of `/checkups`.
**Sections:** growth (weight gain **g/day** vs the published average for the
age, WHO percentiles, per-measurement table) · feeding (per day, median and
longest gap, night feeds 10pm–6am, nursing session length, side split, bottle
oz/day, first-half vs second-half trend) · diapers (wet/dirty per day vs the
age target, days under target) · sleep (h/day split night 7pm–7am vs naps,
longest stretch, typical best stretch) · temperature (every reading, fever
flagged) · medicine (Vitamin-D adherence %, other doses with last-given) ·
tummy time & pumping · milestones · immunizations (given since the last visit,
due at the next one) · **questions for the doctor**.
**Questions list:** the one thing the app can't compute. Add them as they come
up, tick them off in the exam room. New `visit_questions` table.
**Shared logic:** `src/lib/visit-summary.ts` — window-based aggregation (vs
`baby-stats`, which is anchored to "the last N days"), all in the viewer's
local timezone; the server fetches ±1 day of buffer and the client buckets.
Reuses `newborn-health` (diaper targets, temp classification),
`growth-percentiles` and `baby-events` labels so the report never disagrees
with the cards it summarises.
**Range defaults:** most recent completed appointment → next upcoming one,
falling back to the AAP schedule from the birth date, then a 30-day look-back.
Both dates live in the URL (`?from=&to=`).
**Print:** a print stylesheet in `globals.css` drops the fixed app chrome and
flips the forced-dark palette to ink-on-paper — the page is meant to be handed
over or filed. Day-bar strips are plain CSS (not recharts) so they survive
`window.print()` and stay legible at 60+ bars.
**Schema:** `0033_visit_questions.sql` — new couple-scoped table + RLS.
**⚠️ Deploy:** apply `0033`. Until then the page still renders — the questions
query returns empty rather than throwing — but adding a question errors.
**Verified:** `tsc`, `eslint` and `next build` clean; the aggregation module
was exercised against 60 days of synthetic data (30+ assertions on every
metric, plus empty / future-window / single-day / no-birth-date edge cases).
The rendered report itself was **not** exercised — that needs the migration
and an authed session.
**Effort:** ★★

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

### 🚧 BH-14 · Medicine: edit / back-date / scheduled reminders
**What:** Closes the three gaps left by BH-5 — a logged dose was write-only
from /today, back-dating meant knowing that `/log/med` existed, and there was
no way to be reminded to give a dose.
**Editing & back-dating:** every row in `MedsCard` now opens the shared
`EventEditor` (retime, redose, delete — the editor grew an in-dialog Delete
used by /log/[kind] too). A 7-day Vitamin-D strip is the catch-up affordance:
a missed day shows a dashed dot, tapping it opens the editor pre-filled to
that date. The medicine quick-log gained a **Now / Earlier…** toggle so gas
drops given hours ago get their real time. Med doses can be recorded in `ml`.
**Reminders:** new `med_schedules` (couple-scoped: subtype + local "HH:MM"
times + optional dose), managed in Settings → Care reminders. The existing
`/api/cron/care-reminder` job now also nudges per scheduled slot; a slot that
has already been logged goes quiet on its own. Scheduled doses **bypass quiet
hours** — the parent picked the time.
**Shared logic:** `src/lib/med-schedule.ts` (`matchDoses` / `dueSlots` /
`nextSlot`) is used by both the cron and the card, so what the card calls
"given" is exactly what suppresses the push. Doses match slots by nearest
pairing within a 2h tolerance; a missed slot nudges for 2h, then stops at
local midnight.
**Schema:** `0032_med_schedules.sql` — new table + RLS, widens
`care_reminder_state.kind` to `med:<schedule_id>`, and a delete trigger that
prunes orphaned state rows.
**⚠️ Deploy:** apply `0032`; see the notification checklist below.

### ⚠️ Push notifications — the setup that was never finished
**The real blocker was the scheduler, not the keys.** `care-reminder` had no
live trigger anywhere: Vercel Hobby cron is once-a-day, and the pg_cron setup
in 0028's footer can't be completed on hosted Supabase — the `postgres` role
isn't a superuser, so `alter database postgres set app.cron_secret` is denied
and `pg_cron`/`pg_net` must be enabled from Dashboard → Database → Extensions.
So the route was never called. Fixed here:
- Added `.github/workflows/care-reminder-cron.yml` — every 20m, an
  authenticated `curl` from a GitHub runner, mirroring the kick-reminder
  workflow. **Touches no database privileges**, which is the whole point.
  Needs `APP_URL` + `CRON_SECRET` repo secrets. Note the kick-reminder
  workflow's own schedule is still commented out, and GitHub disables
  scheduled workflows after 60 days of repo inactivity.
- VAPID keys were missing from `.env.local`, which broke **local** sends
  (`sendPush()` threw before reaching the network). A generated pair is now
  there and the three vars are documented in `.env.example`. Production is
  separate: `.env*` is gitignored, so Vercel reads its own Project Settings
  env vars, and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is inlined at **build** time —
  changing it needs a redeploy. Two devices are already subscribed, which
  implies the deployment already holds a pair; copy that one down rather than
  pushing a new one up, or both devices must re-subscribe.
- `sendPush()` now reports a missing-VAPID config as a per-send failure rather
  than 500-ing the whole cron run.
- Test-push copy and the service worker's fallback URL are no longer
  kick-specific.

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
