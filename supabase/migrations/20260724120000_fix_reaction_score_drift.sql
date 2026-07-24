-- Fix reaction-bonus score drift.
--
-- toggle_reaction mutated scores.total_points with blind ±2 deltas under a
-- greatest(0, …) floor. That single aggregate mixes challenge points and
-- reaction bonuses, so any desync between reaction rows and those deltas
-- (a reaction removed via a path other than toggle_reaction, a race, or the
-- floor clamping away real points) permanently corrupted the score — an
-- author could end up with fewer points than their original post awarded.
--
-- Fix: make the stored score authoritative by recomputing it from source
-- (awards + reactions received) instead of delta-mutating it. Idempotent and
-- self-healing.

-- Recompute one member's stored score from the source of truth.
create or replace function private.recompute_user_score(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.scores s
  set
    total_points =
      coalesce((select sum(w.points)::integer
                from public.awards w
                where w.user_id = p_user_id), 0)
      + 2 * (select count(*)::integer
             from public.reactions r
             join public.attempts a on a.id = r.attempt_id
             where a.user_id = p_user_id
               and a.status = 'accepted'
               and a.visibility = 'visible'),
    accepted_count =
      (select count(*)::integer
       from public.attempts a
       where a.user_id = p_user_id
         and a.status = 'accepted'),
    updated_at = now()
  where s.user_id = p_user_id;
end;
$$;

revoke all on function private.recompute_user_score(uuid) from public;

-- toggle_reaction: recompute the author's score from source instead of ±2.
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
  else
    insert into public.reactions (attempt_id, user_id, emoji)
    values (p_attempt_id, v_uid, p_emoji);
  end if;

  perform private.recompute_user_score(v_author);

  return private.reaction_summaries_for(p_attempt_id, v_uid);
end;
$$;

revoke all on function public.toggle_reaction(uuid, text) from public;
grant execute on function public.toggle_reaction(uuid, text) to authenticated;

-- One-time repair of any scores already drifted by the old delta logic.
update public.scores s
set
  total_points =
    coalesce((select sum(w.points)::integer
              from public.awards w where w.user_id = s.user_id), 0)
    + 2 * (select count(*)::integer
           from public.reactions r
           join public.attempts a on a.id = r.attempt_id
           where a.user_id = s.user_id
             and a.status = 'accepted'
             and a.visibility = 'visible'),
  accepted_count =
    (select count(*)::integer
     from public.attempts a
     where a.user_id = s.user_id and a.status = 'accepted'),
  updated_at = now();
