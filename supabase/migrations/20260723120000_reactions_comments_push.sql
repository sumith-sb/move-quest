-- Reactions, comments, push subscriptions + feed enrichment.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  constraint reactions_emoji_len check (
    char_length(emoji) between 1 and 8
    and emoji !~ '[[:space:]]'
  ),
  unique (attempt_id, user_id, emoji)
);

create index reactions_attempt_idx on public.reactions (attempt_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint comments_body_len check (char_length(trim(body)) between 1 and 280)
);

create index comments_attempt_created_idx
  on public.comments (attempt_id, created_at asc);

create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS (read for members; writes via SECURITY DEFINER RPCs only)
-- ---------------------------------------------------------------------------

alter table public.reactions enable row level security;
alter table public.comments enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "members_read_reactions_on_visible_attempts"
  on public.reactions for select to authenticated
  using (
    (select public.is_active_member())
    and exists (
      select 1 from public.attempts a
      where a.id = attempt_id
        and a.status = 'accepted'
        and a.visibility = 'visible'
    )
  );

create policy "members_read_comments_on_visible_attempts"
  on public.comments for select to authenticated
  using (
    (select public.is_active_member())
    and exists (
      select 1 from public.attempts a
      where a.id = attempt_id
        and a.status = 'accepted'
        and a.visibility = 'visible'
    )
  );

create policy "members_read_own_push_subscriptions"
  on public.push_subscriptions for select to authenticated
  using ((select public.is_active_member()) and user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Reaction summaries helper (viewer-scoped)
-- ---------------------------------------------------------------------------

create or replace function private.reaction_summaries_for(
  p_attempt_id uuid,
  p_viewer_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'emoji', x.emoji,
        'count', x.cnt,
        'mine', x.mine
      )
      order by x.cnt desc, x.first_seen asc
    ),
    '[]'::jsonb
  )
  from (
    select
      r.emoji,
      count(*)::integer as cnt,
      bool_or(r.user_id = p_viewer_id) as mine,
      min(r.created_at) as first_seen
    from public.reactions r
    where r.attempt_id = p_attempt_id
    group by r.emoji
  ) x;
$$;

create or replace function private.comment_list_for(p_attempt_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'display_name', coalesce(p.display_name, 'Player'),
        'avatar_url', null,
        'body', c.body,
        'created_at', c.created_at
      )
      order by c.created_at asc
    ),
    '[]'::jsonb
  )
  from public.comments c
  join public.profiles p on p.id = c.user_id
  where c.attempt_id = p_attempt_id;
$$;

-- ---------------------------------------------------------------------------
-- toggle_reaction
-- ---------------------------------------------------------------------------

create or replace function public.toggle_reaction(
  p_attempt_id uuid,
  p_emoji text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_author uuid;
  v_existing uuid;
  v_delta integer;
begin
  if not public.is_active_member() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_emoji is null
     or char_length(p_emoji) < 1
     or char_length(p_emoji) > 8
     or p_emoji ~ '[[:space:]]' then
    raise exception 'INVALID_EMOJI';
  end if;

  select a.user_id into v_author
  from public.attempts a
  where a.id = p_attempt_id
    and a.status = 'accepted'
    and a.visibility = 'visible';

  if v_author is null then
    raise exception 'NOT_FOUND';
  end if;

  if v_author = v_uid then
    raise exception 'OWN_POST';
  end if;

  select r.id into v_existing
  from public.reactions r
  where r.attempt_id = p_attempt_id
    and r.user_id = v_uid
    and r.emoji = p_emoji;

  if v_existing is not null then
    delete from public.reactions where id = v_existing;
    v_delta := -2;
  else
    insert into public.reactions (attempt_id, user_id, emoji)
    values (p_attempt_id, v_uid, p_emoji);
    v_delta := 2;
  end if;

  update public.scores
  set total_points = greatest(0, total_points + v_delta),
      updated_at = now()
  where user_id = v_author;

  return private.reaction_summaries_for(p_attempt_id, v_uid);
end;
$$;

revoke all on function public.toggle_reaction(uuid, text) from public;
grant execute on function public.toggle_reaction(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- add_comment
-- ---------------------------------------------------------------------------

create or replace function public.add_comment(
  p_attempt_id uuid,
  p_body text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_body text := trim(coalesce(p_body, ''));
  v_row public.comments;
  v_name text;
begin
  if not public.is_active_member() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if char_length(v_body) < 1 or char_length(v_body) > 280 then
    raise exception 'INVALID_COMMENT';
  end if;

  if not exists (
    select 1 from public.attempts a
    where a.id = p_attempt_id
      and a.status = 'accepted'
      and a.visibility = 'visible'
  ) then
    raise exception 'NOT_FOUND';
  end if;

  insert into public.comments (attempt_id, user_id, body)
  values (p_attempt_id, v_uid, v_body)
  returning * into v_row;

  select coalesce(display_name, 'Player') into v_name
  from public.profiles
  where id = v_uid;

  return jsonb_build_object(
    'id', v_row.id,
    'display_name', v_name,
    'avatar_url', null,
    'body', v_row.body,
    'created_at', v_row.created_at
  );
end;
$$;

revoke all on function public.add_comment(uuid, text) from public;
grant execute on function public.add_comment(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Push subscription RPCs
-- ---------------------------------------------------------------------------

create or replace function public.upsert_push_subscription(p_subscription jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_endpoint text;
begin
  if not public.is_active_member() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if p_subscription is null or jsonb_typeof(p_subscription) <> 'object' then
    raise exception 'INVALID_SUBSCRIPTION';
  end if;

  v_endpoint := p_subscription ->> 'endpoint';
  if v_endpoint is null or length(trim(v_endpoint)) < 8 then
    raise exception 'INVALID_SUBSCRIPTION';
  end if;

  insert into public.push_subscriptions (endpoint, user_id, subscription)
  values (v_endpoint, v_uid, p_subscription)
  on conflict (endpoint) do update
  set user_id = excluded.user_id,
      subscription = excluded.subscription,
      updated_at = now();
end;
$$;

revoke all on function public.upsert_push_subscription(jsonb) from public;
grant execute on function public.upsert_push_subscription(jsonb) to authenticated;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_member() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  delete from public.push_subscriptions
  where endpoint = p_endpoint
    and user_id = (select auth.uid());
end;
$$;

revoke all on function public.delete_push_subscription(text) from public;
grant execute on function public.delete_push_subscription(text) to authenticated;

create or replace function public.list_push_subscriptions_except(p_user_id uuid)
returns table (
  endpoint text,
  user_id uuid,
  subscription jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  select s.endpoint, s.user_id, s.subscription
  from public.push_subscriptions s
  where s.user_id is distinct from p_user_id;
end;
$$;

revoke all on function public.list_push_subscriptions_except(uuid) from public;
grant execute on function public.list_push_subscriptions_except(uuid) to service_role;

create or replace function public.prune_push_subscriptions(p_endpoints text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_endpoints is null or cardinality(p_endpoints) = 0 then
    return;
  end if;
  delete from public.push_subscriptions
  where endpoint = any (p_endpoints);
end;
$$;

revoke all on function public.prune_push_subscriptions(text[]) from public;
grant execute on function public.prune_push_subscriptions(text[]) to service_role;

-- ---------------------------------------------------------------------------
-- get_feed — include reactions + comments
-- Postgres cannot CREATE OR REPLACE when OUT/return columns change.
-- ---------------------------------------------------------------------------

drop function if exists public.get_feed(integer, timestamptz, uuid);

create function public.get_feed(
  p_limit integer default 20,
  p_before_awarded_at timestamptz default null,
  p_before_id uuid default null
)
returns table (
  attempt_id uuid,
  user_id uuid,
  display_name text,
  challenge_id text,
  challenge_title text,
  challenge_prompt text,
  points_awarded integer,
  photo_path text,
  awarded_at timestamptz,
  reactions jsonb,
  comments jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if not public.is_active_member() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return query
  select
    a.id,
    a.user_id,
    coalesce(p.display_name, 'Player'),
    a.challenge_id,
    c.title,
    c.prompt,
    a.points_awarded,
    a.photo_path,
    a.awarded_at,
    private.reaction_summaries_for(a.id, v_uid),
    private.comment_list_for(a.id)
  from public.attempts a
  join public.profiles p on p.id = a.user_id
  join public.challenges c on c.id = a.challenge_id
  where a.status = 'accepted'
    and a.visibility = 'visible'
    and not exists (
      select 1 from public.feed_hides h
      where h.user_id = v_uid and h.attempt_id = a.id
    )
    and (
      p_before_awarded_at is null
      or (a.awarded_at, a.id) < (p_before_awarded_at, p_before_id)
    )
  order by a.awarded_at desc, a.id desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
end;
$$;

revoke all on function public.get_feed(integer, timestamptz, uuid) from public;
grant execute on function public.get_feed(integer, timestamptz, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime (optional live feed engagement)
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.reactions;
alter publication supabase_realtime add table public.comments;
