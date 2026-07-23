-- Move Quest Team V0 schema
-- Domain-gated membership, private photos, claim/finalize verification RPCs

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create schema if not exists private;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.allowed_email_domains (
  domain text primary key,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint allowed_email_domains_lower check (domain = lower(domain))
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  email_domain text not null,
  is_active boolean not null default true,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_len check (
    display_name is null
    or (char_length(trim(display_name)) between 1 and 30)
  )
);

create unique index profiles_display_name_ci
  on public.profiles (lower(display_name))
  where display_name is not null;

create table public.challenges (
  id text primary key,
  slug text not null unique,
  title text not null,
  prompt text not null,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  points integer not null check (points > 0 and points <= 1000),
  criteria jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge_id text not null references public.challenges (id),
  status text not null default 'selected'
    check (status in ('selected', 'processing', 'accepted', 'rejected', 'error')),
  photo_path text,
  photo_sha256 text,
  confidence numeric(4, 3),
  reason text,
  model_name text,
  model_output jsonb,
  points_awarded integer not null default 0 check (points_awarded >= 0),
  visibility text not null default 'visible'
    check (visibility in ('visible', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  awarded_at timestamptz,
  constraint attempts_accepted_shape check (
    (status = 'accepted'
      and photo_path is not null
      and points_awarded > 0
      and awarded_at is not null)
    or
    (status <> 'accepted'
      and points_awarded = 0
      and awarded_at is null)
  ),
  constraint attempts_confidence_range check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  )
);

create unique index attempts_one_open_per_user_challenge
  on public.attempts (user_id, challenge_id)
  where status in ('selected', 'processing', 'rejected', 'error');

create unique index attempts_one_accepted_per_user_challenge
  on public.attempts (user_id, challenge_id)
  where status = 'accepted';

create unique index attempts_photo_path_unique
  on public.attempts (photo_path)
  where photo_path is not null;

create index attempts_feed_idx
  on public.attempts (awarded_at desc, id desc)
  where status = 'accepted' and visibility = 'visible';

create index attempts_user_created_idx
  on public.attempts (user_id, created_at desc);

create table public.verification_leases (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  lease_token uuid not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index verification_leases_expires_idx
  on public.verification_leases (expires_at);

create unique index verification_leases_attempt_active
  on public.verification_leases (attempt_id);

create table public.verification_quota (
  user_id uuid not null references public.profiles (id) on delete cascade,
  window_start timestamptz not null,
  window_kind text not null check (window_kind in ('minute', 'day')),
  count integer not null default 0 check (count >= 0),
  primary key (user_id, window_kind, window_start)
);

create table public.awards (
  attempt_id uuid primary key references public.attempts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  challenge_id text not null references public.challenges (id),
  points integer not null check (points > 0),
  awarded_at timestamptz not null default now(),
  unique (user_id, challenge_id)
);

create table public.scores (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  display_name text not null,
  total_points integer not null default 0 check (total_points >= 0),
  accepted_count integer not null default 0 check (accepted_count >= 0),
  updated_at timestamptz not null default now()
);

create index scores_rank_idx
  on public.scores (total_points desc, accepted_count desc, updated_at asc, user_id asc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  created_at timestamptz not null default now(),
  unique (reporter_id, attempt_id)
);

create table public.feed_hides (
  user_id uuid not null references public.profiles (id) on delete cascade,
  attempt_id uuid not null references public.attempts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, attempt_id)
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

create trigger attempts_set_updated_at
  before update on public.attempts
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Membership helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = (select auth.uid())
      and p.is_active = true
      and u.email_confirmed_at is not null
      and exists (
        select 1
        from public.allowed_email_domains d
        where d.active = true
          and d.domain = p.email_domain
      )
  );
$$;

revoke all on function public.is_active_member() from public;
grant execute on function public.is_active_member() to authenticated;

create or replace function public.email_domain(email text)
returns text
language sql
immutable
as $$
  select lower(split_part(email, '@', 2));
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  domain text := public.email_domain(new.email);
begin
  if not exists (
    select 1 from public.allowed_email_domains d
    where d.active and d.domain = domain
  ) then
    raise exception 'EMAIL_DOMAIN_NOT_ALLOWED';
  end if;

  insert into public.profiles (id, email_domain, is_active)
  values (new.id, domain, true);

  insert into public.scores (user_id, display_name, total_points, accepted_count, updated_at)
  values (new.id, 'Player', 0, 0, now());

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- RPCs — profile / challenges / attempts
-- ---------------------------------------------------------------------------

create or replace function public.claim_display_name(p_display_name text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleaned text := trim(p_display_name);
  result public.profiles;
begin
  if not public.is_active_member() then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if cleaned is null or char_length(cleaned) < 1 or char_length(cleaned) > 30 then
    raise exception 'INVALID_NAME';
  end if;

  update public.profiles
  set display_name = cleaned
  where id = (select auth.uid())
  returning * into result;

  update public.scores
  set display_name = cleaned
  where user_id = (select auth.uid());

  return result;
exception
  when unique_violation then
    raise exception 'NAME_TAKEN';
end;
$$;

revoke all on function public.claim_display_name(text) from public;
grant execute on function public.claim_display_name(text) to authenticated;

create or replace function public.draw_challenges(p_limit integer default 3)
returns setof public.challenges
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_member() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return query
  select c.*
  from public.challenges c
  where c.active = true
    and not exists (
      select 1 from public.attempts a
      where a.user_id = (select auth.uid())
        and a.challenge_id = c.id
        and a.status = 'accepted'
    )
  order by random()
  limit greatest(1, least(coalesce(p_limit, 3), 12));
end;
$$;

revoke all on function public.draw_challenges(integer) from public;
grant execute on function public.draw_challenges(integer) to authenticated;

create or replace function public.select_challenge(p_challenge_id text)
returns public.attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.attempts;
begin
  if not public.is_active_member() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if not exists (
    select 1 from public.challenges c
    where c.id = p_challenge_id and c.active = true
  ) then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;

  if exists (
    select 1 from public.attempts a
    where a.user_id = (select auth.uid())
      and a.challenge_id = p_challenge_id
      and a.status = 'accepted'
  ) then
    raise exception 'ALREADY_COMPLETED';
  end if;

  select * into result
  from public.attempts a
  where a.user_id = (select auth.uid())
    and a.challenge_id = p_challenge_id
    and a.status in ('selected', 'rejected', 'error')
  order by a.created_at desc
  limit 1
  for update;

  if found then
    update public.attempts
    set status = 'selected',
        reason = null,
        confidence = null,
        model_name = null,
        model_output = null,
        updated_at = now()
    where id = result.id
    returning * into result;
    return result;
  end if;

  insert into public.attempts (user_id, challenge_id, status)
  values ((select auth.uid()), p_challenge_id, 'selected')
  returning * into result;

  return result;
end;
$$;

revoke all on function public.select_challenge(text) from public;
grant execute on function public.select_challenge(text) to authenticated;

-- Claim a verification lease (auth user). Returns lease + challenge payload.
create or replace function public.claim_verification(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  attempt_row public.attempts;
  challenge_row public.challenges;
  lease_token uuid := gen_random_uuid();
  minute_start timestamptz := date_trunc('minute', now());
  day_start timestamptz := date_trunc('day', now());
  minute_count integer;
  day_count integer;
begin
  if not public.is_active_member() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  -- quota: 3 / minute
  insert into public.verification_quota (user_id, window_start, window_kind, count)
  values (uid, minute_start, 'minute', 1)
  on conflict (user_id, window_kind, window_start)
  do update set count = public.verification_quota.count + 1
  returning count into minute_count;

  if minute_count > 3 then
    raise exception 'RATE_LIMIT_MINUTE';
  end if;

  -- quota: 30 / day
  insert into public.verification_quota (user_id, window_start, window_kind, count)
  values (uid, day_start, 'day', 1)
  on conflict (user_id, window_kind, window_start)
  do update set count = public.verification_quota.count + 1
  returning count into day_count;

  if day_count > 30 then
    raise exception 'RATE_LIMIT_DAY';
  end if;

  select * into attempt_row
  from public.attempts a
  where a.id = p_attempt_id
  for update;

  if not found or attempt_row.user_id <> uid then
    raise exception 'ATTEMPT_NOT_FOUND';
  end if;

  if attempt_row.status = 'accepted' then
    raise exception 'ALREADY_ACCEPTED';
  end if;

  if attempt_row.status = 'processing' then
    -- allow reclaim only if lease expired
    if exists (
      select 1 from public.verification_leases l
      where l.attempt_id = attempt_row.id and l.expires_at > now()
    ) then
      raise exception 'IN_PROGRESS';
    end if;
  end if;

  select * into challenge_row
  from public.challenges c
  where c.id = attempt_row.challenge_id and c.active = true;

  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;

  delete from public.verification_leases where attempt_id = attempt_row.id;

  insert into public.verification_leases (attempt_id, user_id, lease_token, expires_at)
  values (attempt_row.id, uid, lease_token, now() + interval '2 minutes');

  update public.attempts
  set status = 'processing',
      updated_at = now(),
      reason = null,
      confidence = null,
      model_name = null,
      model_output = null
  where id = attempt_row.id;

  return jsonb_build_object(
    'attempt_id', attempt_row.id,
    'lease_token', lease_token,
    'photo_path', uid::text || '/' || attempt_row.id::text || '.jpg',
    'challenge', jsonb_build_object(
      'id', challenge_row.id,
      'slug', challenge_row.slug,
      'title', challenge_row.title,
      'prompt', challenge_row.prompt,
      'difficulty', challenge_row.difficulty,
      'points', challenge_row.points,
      'criteria', challenge_row.criteria
    )
  );
end;
$$;

revoke all on function public.claim_verification(uuid) from public;
grant execute on function public.claim_verification(uuid) to authenticated;

-- Service-role finalize after successful AI pass + storage upload
create or replace function public.finalize_verification(
  p_attempt_id uuid,
  p_lease_token uuid,
  p_user_id uuid,
  p_photo_path text,
  p_photo_sha256 text,
  p_confidence numeric,
  p_reason text,
  p_model_name text,
  p_model_output jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_row public.attempts;
  challenge_row public.challenges;
  lease_row public.verification_leases;
  expected_path text;
  award_points integer;
  score_row public.scores;
begin
  select * into lease_row
  from public.verification_leases l
  where l.attempt_id = p_attempt_id
    and l.lease_token = p_lease_token
    and l.user_id = p_user_id
  for update;

  if not found or lease_row.expires_at < now() then
    raise exception 'LEASE_INVALID';
  end if;

  select * into attempt_row
  from public.attempts a
  where a.id = p_attempt_id
  for update;

  if not found or attempt_row.user_id <> p_user_id then
    raise exception 'ATTEMPT_NOT_FOUND';
  end if;

  if attempt_row.status = 'accepted' then
    return jsonb_build_object(
      'status', 'accepted',
      'points_awarded', attempt_row.points_awarded,
      'reason', attempt_row.reason,
      'retryable', false
    );
  end if;

  if attempt_row.status <> 'processing' then
    raise exception 'INVALID_STATUS';
  end if;

  expected_path := p_user_id::text || '/' || p_attempt_id::text || '.jpg';
  if p_photo_path is distinct from expected_path then
    raise exception 'PHOTO_PATH_MISMATCH';
  end if;

  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'challenge-photos'
      and o.name = expected_path
  ) then
    raise exception 'PHOTO_MISSING';
  end if;

  select * into challenge_row
  from public.challenges c
  where c.id = attempt_row.challenge_id;

  if not found then
    raise exception 'CHALLENGE_NOT_FOUND';
  end if;

  award_points := challenge_row.points;

  update public.attempts
  set status = 'accepted',
      photo_path = expected_path,
      photo_sha256 = p_photo_sha256,
      confidence = p_confidence,
      reason = coalesce(nullif(trim(p_reason), ''), 'Looks good!'),
      model_name = p_model_name,
      model_output = p_model_output,
      points_awarded = award_points,
      awarded_at = now(),
      updated_at = now()
  where id = attempt_row.id
  returning * into attempt_row;

  insert into public.awards (attempt_id, user_id, challenge_id, points, awarded_at)
  values (attempt_row.id, p_user_id, attempt_row.challenge_id, award_points, attempt_row.awarded_at);

  insert into public.scores (user_id, display_name, total_points, accepted_count, updated_at)
  select p_user_id, coalesce(pr.display_name, 'Player'), award_points, 1, attempt_row.awarded_at
  from public.profiles pr
  where pr.id = p_user_id
  on conflict (user_id) do update
  set total_points = public.scores.total_points + excluded.total_points,
      accepted_count = public.scores.accepted_count + 1,
      updated_at = excluded.updated_at,
      display_name = coalesce(
        (select display_name from public.profiles where id = p_user_id),
        public.scores.display_name
      );

  delete from public.verification_leases where attempt_id = p_attempt_id;

  select * into score_row from public.scores where user_id = p_user_id;

  return jsonb_build_object(
    'status', 'accepted',
    'pass', true,
    'confidence', attempt_row.confidence,
    'reason', attempt_row.reason,
    'points_awarded', award_points,
    'retryable', false,
    'score', to_jsonb(score_row)
  );
end;
$$;

revoke all on function public.finalize_verification(
  uuid, uuid, uuid, text, text, numeric, text, text, jsonb
) from public;
grant execute on function public.finalize_verification(
  uuid, uuid, uuid, text, text, numeric, text, text, jsonb
) to service_role;
-- Edge Functions call this with the service role; do not grant to authenticated.

create or replace function public.mark_verification_failed(
  p_attempt_id uuid,
  p_lease_token uuid,
  p_user_id uuid,
  p_status text,
  p_reason text,
  p_confidence numeric default null,
  p_model_name text default null,
  p_model_output jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_row public.attempts;
begin
  if p_status not in ('rejected', 'error') then
    raise exception 'INVALID_STATUS';
  end if;

  if not exists (
    select 1 from public.verification_leases l
    where l.attempt_id = p_attempt_id
      and l.lease_token = p_lease_token
      and l.user_id = p_user_id
      and l.expires_at >= now()
  ) then
    raise exception 'LEASE_INVALID';
  end if;

  update public.attempts
  set status = p_status,
      confidence = p_confidence,
      reason = p_reason,
      model_name = p_model_name,
      model_output = p_model_output,
      photo_path = null,
      photo_sha256 = null,
      points_awarded = 0,
      awarded_at = null,
      updated_at = now()
  where id = p_attempt_id
    and user_id = p_user_id
    and status = 'processing'
  returning * into attempt_row;

  if not found then
    raise exception 'ATTEMPT_NOT_FOUND';
  end if;

  delete from public.verification_leases where attempt_id = p_attempt_id;

  return jsonb_build_object(
    'status', p_status,
    'pass', false,
    'confidence', p_reason,
    'confidence', p_confidence,
    'points_awarded', 0,
    'retryable', true
  );
end;
$$;

revoke all on function public.mark_verification_failed(
  uuid, uuid, uuid, text, text, numeric, text, jsonb
) from public;
grant execute on function public.mark_verification_failed(
  uuid, uuid, uuid, text, text, numeric, text, jsonb
) to service_role;

-- Feed / leaderboard
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
    and a.user_id <> (select auth.uid())
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

revoke all on function public.get_feed(integer, timestamptz, uuid) from public;
grant execute on function public.get_feed(integer, timestamptz, uuid) to authenticated;

create or replace function public.get_leaderboard(p_limit integer default 100)
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
  select
    row_number() over (
      order by s.total_points desc, s.accepted_count desc, s.updated_at asc, s.user_id asc
    ) as rank,
    s.user_id,
    s.display_name,
    s.total_points,
    s.accepted_count,
    s.updated_at
  from public.scores s
  join public.profiles p on p.id = s.user_id
  where p.is_active = true
  order by s.total_points desc, s.accepted_count desc, s.updated_at asc, s.user_id asc
  limit greatest(1, least(coalesce(p_limit, 100), 200));
end;
$$;

revoke all on function public.get_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to authenticated;

create or replace function public.report_attempt(p_attempt_id uuid, p_reason text)
returns public.reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.reports;
  cleaned text := trim(p_reason);
begin
  if not public.is_active_member() then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if cleaned is null or char_length(cleaned) < 3 then
    raise exception 'INVALID_REASON';
  end if;
  if not exists (
    select 1 from public.attempts a
    where a.id = p_attempt_id and a.status = 'accepted'
  ) then
    raise exception 'ATTEMPT_NOT_FOUND';
  end if;

  insert into public.reports (reporter_id, attempt_id, reason)
  values ((select auth.uid()), p_attempt_id, cleaned)
  on conflict (reporter_id, attempt_id) do update
  set reason = excluded.reason
  returning * into result;

  return result;
end;
$$;

revoke all on function public.report_attempt(uuid, text) from public;
grant execute on function public.report_attempt(uuid, text) to authenticated;

create or replace function public.hide_feed_item(p_attempt_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_member() then
    raise exception 'NOT_AUTHORIZED';
  end if;
  insert into public.feed_hides (user_id, attempt_id)
  values ((select auth.uid()), p_attempt_id)
  on conflict do nothing;
end;
$$;

revoke all on function public.hide_feed_item(uuid) from public;
grant execute on function public.hide_feed_item(uuid) to authenticated;

create or replace function public.admin_set_attempt_visibility(
  p_attempt_id uuid,
  p_visibility text
)
returns public.attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.attempts;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_admin and p.is_active
  ) then
    raise exception 'NOT_AUTHORIZED';
  end if;
  if p_visibility not in ('visible', 'hidden', 'removed') then
    raise exception 'INVALID_VISIBILITY';
  end if;

  update public.attempts
  set visibility = p_visibility, updated_at = now()
  where id = p_attempt_id
  returning * into result;

  if not found then
    raise exception 'ATTEMPT_NOT_FOUND';
  end if;
  return result;
end;
$$;

revoke all on function public.admin_set_attempt_visibility(uuid, text) from public;
grant execute on function public.admin_set_attempt_visibility(uuid, text) to authenticated;

-- Cleanup helper for Edge Function (service role)
create or replace function public.list_expired_verification_leases()
returns table (
  attempt_id uuid,
  user_id uuid,
  photo_path text,
  lease_token uuid
)
language sql
security definer
set search_path = ''
as $$
  select
    l.attempt_id,
    l.user_id,
    l.user_id::text || '/' || l.attempt_id::text || '.jpg' as photo_path,
    l.lease_token
  from public.verification_leases l
  where l.expires_at < now();
$$;

revoke all on function public.list_expired_verification_leases() from public;
grant execute on function public.list_expired_verification_leases() to service_role;

create or replace function public.release_expired_lease(p_attempt_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.verification_leases where attempt_id = p_attempt_id and expires_at < now();
  update public.attempts
  set status = 'error',
      reason = 'Verification timed out. Please try again.',
      updated_at = now()
  where id = p_attempt_id and status = 'processing';
end;
$$;

revoke all on function public.release_expired_lease(uuid) from public;
grant execute on function public.release_expired_lease(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.allowed_email_domains enable row level security;
alter table public.profiles enable row level security;
alter table public.challenges enable row level security;
alter table public.attempts enable row level security;
alter table public.verification_leases enable row level security;
alter table public.verification_quota enable row level security;
alter table public.awards enable row level security;
alter table public.scores enable row level security;
alter table public.reports enable row level security;
alter table public.feed_hides enable row level security;

create policy "members_read_active_domains"
  on public.allowed_email_domains for select to authenticated
  using ((select public.is_active_member()));

create policy "members_read_profiles"
  on public.profiles for select to authenticated
  using ((select public.is_active_member()) and is_active = true);

create policy "members_read_challenges"
  on public.challenges for select to authenticated
  using ((select public.is_active_member()) and active = true);

create policy "members_read_own_or_accepted_attempts"
  on public.attempts for select to authenticated
  using (
    (select public.is_active_member())
    and (
      user_id = (select auth.uid())
      or (status = 'accepted' and visibility = 'visible')
    )
  );

create policy "members_read_scores"
  on public.scores for select to authenticated
  using ((select public.is_active_member()));

create policy "members_read_own_hides"
  on public.feed_hides for select to authenticated
  using ((select public.is_active_member()) and user_id = (select auth.uid()));

create policy "members_read_own_reports"
  on public.reports for select to authenticated
  using ((select public.is_active_member()) and reporter_id = (select auth.uid()));

-- No direct client writes on sensitive tables (RPCs only)
-- verification_leases / quota / awards: no policies for authenticated → denied

-- ---------------------------------------------------------------------------
-- Storage bucket + policies
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'challenge-photos',
  'challenge-photos',
  false,
  1048576,
  array['image/jpeg']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Authenticated users cannot insert/update/delete directly.
-- Edge Function (service role) uploads after AI pass.
-- Members may SELECT (needed for signed URLs) only for own pending or accepted visible.

create policy "members_select_allowed_photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'challenge-photos'
    and (select public.is_active_member())
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.attempts a
        where a.photo_path = name
          and a.status = 'accepted'
          and a.visibility = 'visible'
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.scores;
alter publication supabase_realtime add table public.attempts;

-- ---------------------------------------------------------------------------
-- Seed: allow one placeholder domain (replace in production)
-- ---------------------------------------------------------------------------

insert into public.allowed_email_domains (domain, active)
values ('goodspeed.studio', true)
on conflict (domain) do nothing;

insert into public.challenges (id, slug, title, prompt, difficulty, points, criteria, active) values
(
  'ch_sky_blue', 'sky-blue', 'Find the sky',
  'Photograph a clear view of the open sky outdoors.',
  'easy', 10,
  '[{"id":"sky_visible","description":"Open sky is clearly visible in the photo"},{"id":"outdoors","description":"The photo appears to be taken outdoors"},{"id":"physical_scene","description":"The photo shows a physical outdoor scene, not a screen, print, or drawing"}]'::jsonb,
  true
),
(
  'ch_green_leaf', 'green-leaf', 'Leaf hunt',
  'Photograph a green leaf up close.',
  'easy', 10,
  '[{"id":"leaf_visible","description":"At least one green leaf is clearly visible"},{"id":"plant_context","description":"The leaf belongs to a plant (not a drawing or screen)"},{"id":"physical_scene","description":"The photo shows a physical plant, not a screen, print, or drawing"}]'::jsonb,
  true
),
(
  'ch_door_handle', 'door-handle', 'Door handle',
  'Photograph a door handle or doorknob.',
  'easy', 10,
  '[{"id":"handle_visible","description":"A door handle or doorknob is clearly visible"},{"id":"door_context","description":"The handle is attached to a door or door-like surface"},{"id":"physical_scene","description":"The photo shows a physical door handle, not a screen, print, or drawing"}]'::jsonb,
  true
),
(
  'ch_shoe_pair', 'shoe-pair', 'Shoes on the floor',
  'Photograph a pair of shoes resting on the floor.',
  'easy', 10,
  '[{"id":"shoes_visible","description":"Two shoes are clearly visible"},{"id":"floor_context","description":"The shoes appear to be resting on a floor or ground"},{"id":"physical_scene","description":"The photo shows physical shoes, not a screen, print, or drawing"}]'::jsonb,
  true
),
(
  'ch_street_sign', 'street-sign', 'Street sign',
  'Photograph a street name or traffic sign outdoors.',
  'medium', 25,
  '[{"id":"sign_visible","description":"A street or traffic sign is clearly recognizable"},{"id":"outdoors","description":"The photo appears to be taken outdoors"},{"id":"physical_scene","description":"The photo shows a physical sign, not a screen, print, or drawing"}]'::jsonb,
  true
),
(
  'ch_bicycle', 'bicycle', 'Wheels turning',
  'Photograph a bicycle (any bike, parked or moving).',
  'medium', 25,
  '[{"id":"bike_visible","description":"A bicycle is clearly visible"},{"id":"wheels_present","description":"At least one bicycle wheel is visible"},{"id":"physical_scene","description":"The photo shows a physical bicycle, not a screen, print, or drawing"}]'::jsonb,
  true
),
(
  'ch_coffee_cup', 'coffee-cup', 'Cup in hand',
  'Photograph a coffee or tea cup (mug, takeaway cup, or teacup).',
  'medium', 25,
  '[{"id":"cup_visible","description":"A cup or mug is clearly visible"},{"id":"drinkware","description":"The object is drinkware (not a bowl or plate)"},{"id":"physical_scene","description":"The photo shows physical drinkware, not a screen, print, or drawing"}]'::jsonb,
  true
),
(
  'ch_staircase', 'staircase', 'Take the stairs',
  'Photograph a staircase with at least three visible steps.',
  'medium', 25,
  '[{"id":"stairs_visible","description":"A staircase is clearly visible"},{"id":"multiple_steps","description":"At least three steps can be seen"},{"id":"physical_scene","description":"The photo shows a physical staircase, not a screen, print, or drawing"}]'::jsonb,
  true
),
(
  'ch_reflection', 'reflection', 'Catch a reflection',
  'Photograph a clear reflection of an object in glass, water, or a mirror (not a selfie of yourself).',
  'hard', 50,
  '[{"id":"reflection_visible","description":"A clear reflection of an object is visible"},{"id":"reflective_surface","description":"Glass, water, metal, or a mirror is present as the reflecting surface"},{"id":"physical_scene","description":"The photo shows a physical reflective scene, not a screen, print, or drawing"}]'::jsonb,
  true
),
(
  'ch_yellow_object', 'yellow-object', 'Something yellow',
  'Photograph a clearly yellow everyday object outdoors or indoors.',
  'hard', 50,
  '[{"id":"yellow_object","description":"A distinctly yellow object is the main subject"},{"id":"object_clarity","description":"The yellow object is in focus and easily identifiable"},{"id":"physical_scene","description":"The photo shows a physical yellow object, not a screen, print, or drawing"}]'::jsonb,
  true
),
(
  'ch_clock_face', 'clock-face', 'What time is it?',
  'Photograph a clock or watch face showing the time.',
  'hard', 50,
  '[{"id":"clock_visible","description":"A clock or watch face is clearly visible"},{"id":"time_readable","description":"The time display (hands or digits) is readable"},{"id":"physical_scene","description":"The photo shows a physical clock or watch, not a screen, print, or drawing"}]'::jsonb,
  true
)
on conflict (id) do nothing;

-- person-waving intentionally omitted from seed (disabled for v0 privacy)
