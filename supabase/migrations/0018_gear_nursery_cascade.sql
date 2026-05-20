-- Shortlists are now managed inline on the nursery page. If a nursery row
-- is deleted, the user's intent is "I no longer need this item" — the
-- attached candidates become meaningless. Cascade the delete so we don't
-- leave orphan shortlist gear_items the user has no UI to see or clean up.
--
-- gear_watchers already cascades from gear_items, so deleting a nursery row
-- removes: nursery row → shortlist gear_item → its candidate watchers and
-- price history in one shot.

alter table public.gear_items
  drop constraint if exists gear_items_nursery_item_id_fkey;

alter table public.gear_items
  add constraint gear_items_nursery_item_id_fkey
  foreign key (nursery_item_id)
  references public.nursery_checklist(id)
  on delete cascade;
