-- Store the scraped product title + image for each watcher so a list of
-- options from the same retailer is actually distinguishable visually.
-- Both nullable: not every retailer exposes JSON-LD/OG tags cleanly, and
-- existing rows can be backfilled lazily on the next price refresh.

alter table public.gear_watchers
  add column if not exists title text,
  add column if not exists image_url text;
