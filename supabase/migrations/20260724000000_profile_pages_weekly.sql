-- ---------------------------------------------------------------------------
-- Profile pages + weekly leaderboard
--
-- Adds read RPCs for a per-user profile page (own + others) and a weekly
-- leaderboard variant. Weekly points are DERIVED from awards.awarded_at
-- (no schema change, no reset job): "points earned from moves this week".
-- Reaction bonuses live only in scores.total_points, so they count toward
-- all-time but not the weekly figure — weekly = challenge points this week.
--
-- Also persists the SELECT grants the app's direct reads
-- (profiles/scores/challenges) rely on; the RLS policies existed but the
-- table-level grants were never encoded in migrations.
-- ---------------------------------------------------------------------------

grant select on public.profiles to authenticated;
grant select on public.scores to authenticated;
grant select on public.challenges to authenticated;
-- attempts: the challenge-photos storage signing policy subqueries attempts
-- (photo_path / status / visibility) while creating signed URLs, so the
-- authenticated role needs SELECT on just those columns. Deliberately NOT a
-- full-row grant — that would expose verification internals (model_output,
-- confidence, reason, model_name, photo_sha256) via PostgREST. Feed/profile
-- reads all go through SECURITY DEFINER RPCs, which don't need this grant.
grant select (photo_path, status, visibility) on public.attempts to authenticated;

-- ---------------------------------------------------------------------------
-- get_weekly_leaderboard — rank by challenge points earned since Monday.
-- ---------------------------------------------------------------------------
create or replace function public.get_weekly_leaderboard(p_limit integer default 100)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  total_points integer,
  accepted_count integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_member() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return query
  with wk as (
    select
      w.user_id,
      sum(w.points)::integer as pts,
      count(*)::integer as cnt,
      max(w.awarded_at) as last_at
    from public.awards w
    where w.awarded_at >= date_trunc('week', now())
    group by w.user_id
  )
  select
    row_number() over (
      order by wk.pts desc, wk.cnt desc, wk.last_at asc, wk.user_id asc
    ) as rank,
    wk.user_id,
    coalesce(p.display_name, 'Player'),
    wk.pts,
    wk.cnt,
    wk.last_at
  from wk
  join public.profiles p on p.id = wk.user_id
  where p.is_active = true
  order by wk.pts desc, wk.cnt desc, wk.last_at asc, wk.user_id asc
  limit greatest(1, least(coalesce(p_limit, 100), 200));
end;
$$;

revoke all on function public.get_weekly_leaderboard(integer) from public;
grant execute on function public.get_weekly_leaderboard(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- get_user_profile — header stats for one member's profile page.
-- uploads      = accepted moves (scores.accepted_count)
-- week_points  = challenge points earned since Monday (derived from awards)
-- all_time_points = scores.total_points (challenge points + reaction bonuses)
-- ---------------------------------------------------------------------------
create or replace function public.get_user_profile(p_user_id uuid)
returns table (
  user_id uuid,
  display_name text,
  uploads integer,
  week_points integer,
  all_time_points integer
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_member() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return query
  select
    pr.id,
    coalesce(pr.display_name, 'Player'),
    coalesce(s.accepted_count, 0)::integer as uploads,
    coalesce(
      (
        select sum(w.points)::integer
        from public.awards w
        where w.user_id = pr.id
          and w.awarded_at >= date_trunc('week', now())
      ),
      0
    ) as week_points,
    coalesce(s.total_points, 0)::integer as all_time_points
  from public.profiles pr
  left join public.scores s on s.user_id = pr.id
  where pr.id = p_user_id
    and pr.is_active = true;
end;
$$;

revoke all on function public.get_user_profile(uuid) from public;
grant execute on function public.get_user_profile(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_user_posts — one member's accepted, visible posts (newest first),
-- with reactions + comments. Mirrors get_feed but scoped to a user and
-- without the per-viewer feed_hides filter (it's that user's own gallery).
-- ---------------------------------------------------------------------------
create or replace function public.get_user_posts(
  p_user_id uuid,
  p_limit integer default 30,
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
  where a.user_id = p_user_id
    and a.status = 'accepted'
    and a.visibility = 'visible'
    and (
      p_before_awarded_at is null
      or (a.awarded_at, a.id) < (p_before_awarded_at, p_before_id)
    )
  order by a.awarded_at desc, a.id desc
  limit greatest(1, least(coalesce(p_limit, 30), 60));
end;
$$;

revoke all on function public.get_user_posts(uuid, integer, timestamptz, uuid) from public;
grant execute on function public.get_user_posts(uuid, integer, timestamptz, uuid) to authenticated;
