# Parent Prep Hub — Backlog

Post-launch improvements. New items get appended; tags: `📋 Captured` → `🚧 In progress` → `✅ Done`.

---

## Price Pulse

### 📋 PP-1 · Real-world price data + alerts when price changes
**What:** Pull current prices automatically. Notify when a tracked item hits the target.
**Why:** Manual entry defeats the point — we forget to check.
**Approach options:**
- *Data:* free + fragile = build a scraper per retailer (Playwright in a Vercel Cron or Supabase Edge Function). Paid + robust = Keepa (~$19/mo, Amazon-only) or Rainforest / SerpAPI (multi-retailer, $$).
- *Alerts:* web push (PWA + service worker) and/or email via Resend SMTP when `current_price ≤ target_price`.
- *Schedule:* Vercel Cron daily.
**Schema impact:** none — uses existing `gear_items` + `gear_price_history`.
**Effort:** ★★★★ (biggest item; scraper reliability is the real cost)

### 📋 PP-2 · Track each item across many retailers
**What:** One product, many watch URLs (Amazon, Target, Walmart, Babylist…). Show the best current price.
**Why:** Same item often varies $50–100 across retailers; we want lowest.
**Schema impact:** new `gear_watchers` table (`item_id`, `retailer`, `url`, `current_price`, `last_checked_at`). `gear_items.current_price` becomes a derived "best across watchers" value.
**Effort:** ★★★ (depends on PP-1 — pair them)

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

- **PP-1 + PP-2** ship together — once you're scraping, multi-retailer is the natural shape.
- **NB-3 + NB-4** ship together — curated Telugu names seed the pool, LLM extends it. Doing only NB-4 with a Western prompt would be the wrong default.
- **NB-1** can ship independently and unlocks the most product value (couple mode is the actual core loop).
- **NB-2** is small and standalone — can slot in any time as a polish item.
