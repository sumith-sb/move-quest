-- Real remaining-catalog count (draw_challenges is capped at 12 rows).

create or replace function public.count_remaining_challenges()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_active_member() then
    raise exception 'NOT_AUTHORIZED';
  end if;

  return (
    select count(*)::integer
    from public.challenges c
    where c.active = true
      and not exists (
        select 1 from public.attempts a
        where a.user_id = (select auth.uid())
          and a.challenge_id = c.id
          and a.status = 'accepted'
      )
  );
end;
$$;

revoke all on function public.count_remaining_challenges() from public;
grant execute on function public.count_remaining_challenges() to authenticated;
