-- Include the viewer's own accepted clears in the team feed.
-- Solo / early-team testing previously looked "broken" because get_feed
-- filtered a.user_id <> auth.uid().

create or replace function public.get_feed(
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
  awarded_at timestamptz
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
    a.id,
    a.user_id,
    coalesce(p.display_name, 'Player'),
    a.challenge_id,
    c.title,
    c.prompt,
    a.points_awarded,
    a.photo_path,
    a.awarded_at
  from public.attempts a
  join public.profiles p on p.id = a.user_id
  join public.challenges c on c.id = a.challenge_id
  where a.status = 'accepted'
    and a.visibility = 'visible'
    and not exists (
      select 1 from public.feed_hides h
      where h.user_id = (select auth.uid()) and h.attempt_id = a.id
    )
    and (
      p_before_awarded_at is null
      or (a.awarded_at, a.id) < (p_before_awarded_at, p_before_id)
    )
  order by a.awarded_at desc, a.id desc
  limit greatest(1, least(coalesce(p_limit, 20), 50));
end;
$$;
