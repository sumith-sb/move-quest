-- Move Quest database smoke tests (run via supabase db test / psql)
-- These assert core constraints and helper behavior with SQL.

begin;

-- Domain helper
select public.email_domain('Ada@GoodSpeed.Studio') = 'goodspeed.studio' as domain_ok;

-- Challenges seeded
select count(*) >= 999 as challenges_seeded from public.challenges where active;

-- Unique accepted constraint exists
select count(*) = 1 as accepted_unique_exists
from pg_indexes
where indexname = 'attempts_one_accepted_per_user_challenge';

-- RPC execute grants: authenticated can claim/draw/select/feed/leaderboard
select has_function_privilege('authenticated', 'public.claim_display_name(text)', 'execute') as claim_name_grant;
select has_function_privilege('authenticated', 'public.claim_verification(uuid)', 'execute') as claim_verify_grant;
select not has_function_privilege('authenticated', 'public.finalize_verification(uuid,uuid,uuid,text,text,numeric,text,text,jsonb)', 'execute')
  as finalize_not_for_clients;

-- Storage bucket
select exists (
  select 1 from storage.buckets where id = 'challenge-photos' and public = false
) as private_bucket;

rollback;
