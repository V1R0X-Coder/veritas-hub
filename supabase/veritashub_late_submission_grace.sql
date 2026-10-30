-- Optional per-quiz grace period; zero preserves the original hard cutoff.
alter table public.veritashub_quizzes
  add column if not exists late_grace_minutes integer not null default 0
  check (late_grace_minutes between 0 and 10080);

create or replace function public.veritashub_enforce_quiz_deadline()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_deadline timestamptz; v_grace integer;
begin
 select deadline_at, late_grace_minutes into v_deadline,v_grace
 from public.veritashub_quizzes where id=new.quiz_id;
 if v_deadline is not null
    and pg_catalog.clock_timestamp() >= v_deadline + pg_catalog.make_interval(mins => v_grace)
 then raise exception 'Quiz submission deadline and grace period have passed'; end if;
 return new;
end $$;
revoke all on function public.veritashub_enforce_quiz_deadline() from public,anon,authenticated;
