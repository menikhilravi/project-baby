-- Hybrid search for notes: semantic (vector embeddings via Gemini) blended
-- with trigram lexical match via Reciprocal Rank Fusion (RRF).

create extension if not exists vector;
create extension if not exists pg_trgm;

-- 768-dim vectors from Gemini text-embedding-004. Nullable so saves don't
-- block when the embedding API is down or for backfill scenarios.
alter table public.notes
  add column if not exists embedding vector(768);

-- Trigram indexes are tiny at this KB scale but make the operators happy.
create index if not exists notes_title_trgm_idx
  on public.notes using gin (title gin_trgm_ops);
create index if not exists notes_body_trgm_idx
  on public.notes using gin (body gin_trgm_ops);

-- Vector index. ivfflat needs ANALYZE after seeding; safe to add now.
create index if not exists notes_embedding_idx
  on public.notes using ivfflat (embedding vector_cosine_ops) with (lists = 50);

-- Hybrid search. Caller embeds the query with task=RETRIEVAL_QUERY and
-- passes both the raw text (for trigram) and the vector. Either side may be
-- null/empty — function degrades to whichever signal is available.
--
-- Scoring: Reciprocal Rank Fusion. score = 1/(k+rank_vec) + 1/(k+rank_trg).
-- Stable across mismatched score scales (cosine distance vs trigram similarity).
create or replace function public.search_notes(
  p_query text,
  p_query_embedding vector(768),
  p_couple_id uuid,
  p_user_id uuid,
  p_limit int default 30,
  p_rrf_k int default 60
)
returns table (
  id bigint,
  title text,
  body text,
  pinned boolean,
  updated_at timestamptz,
  score double precision
)
language sql
stable
security definer
set search_path = public
as $$
  with scoped as (
    select id, title, body, pinned, updated_at, embedding
    from public.notes
    where
      (p_couple_id is not null and couple_id = p_couple_id)
      or (p_couple_id is null and user_id = p_user_id)
  ),
  vec_ranked as (
    select id,
           row_number() over (order by embedding <=> p_query_embedding) as r
    from scoped
    where p_query_embedding is not null
      and embedding is not null
    order by embedding <=> p_query_embedding
    limit p_limit * 4
  ),
  trg_ranked as (
    select id,
           row_number() over (
             order by greatest(
               similarity(title, p_query),
               similarity(coalesce(body, ''), p_query)
             ) desc
           ) as r
    from scoped
    where p_query is not null
      and p_query <> ''
      and (
        similarity(title, p_query) > 0.1
        or similarity(coalesce(body, ''), p_query) > 0.1
      )
    order by greatest(
      similarity(title, p_query),
      similarity(coalesce(body, ''), p_query)
    ) desc
    limit p_limit * 4
  ),
  combined as (
    select coalesce(v.id, t.id) as id,
           coalesce(1.0::double precision / (p_rrf_k + v.r), 0)
             + coalesce(1.0::double precision / (p_rrf_k + t.r), 0) as score
    from vec_ranked v
    full outer join trg_ranked t on v.id = t.id
  )
  select s.id, s.title, s.body, s.pinned, s.updated_at, c.score
  from combined c
  join scoped s on s.id = c.id
  order by c.score desc, s.pinned desc, s.updated_at desc
  limit p_limit;
$$;

revoke all on function public.search_notes(
  text, vector(768), uuid, uuid, int, int
) from public;
grant execute on function public.search_notes(
  text, vector(768), uuid, uuid, int, int
) to authenticated;
