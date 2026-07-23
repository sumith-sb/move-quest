-- Fix signup trigger: PL/pgSQL variable "domain" clashed with
-- allowed_email_domains.domain → "column reference domain is ambiguous"
-- which GoTrue surfaces as "Database error saving new user".

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_domain text := public.email_domain(new.email);
begin
  if not exists (
    select 1 from public.allowed_email_domains d
    where d.active and d.domain = v_domain
  ) then
    raise exception 'EMAIL_DOMAIN_NOT_ALLOWED';
  end if;

  insert into public.profiles (id, email_domain, is_active)
  values (new.id, v_domain, true);

  insert into public.scores (user_id, display_name, total_points, accepted_count, updated_at)
  values (new.id, 'Player', 0, 0, now());

  return new;
end;
$$;
