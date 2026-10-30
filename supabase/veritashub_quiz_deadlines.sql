-- Additive quiz deadline enforcement. Existing quizzes remain without a deadline.
alter table public.veritashub_quizzes
 add column if not exists deadline_at timestamptz;
alter table public.veritashub_quizzes
 add constraint veritashub_quiz_deadline_valid check (deadline_at is null or deadline_at > created_at);

-- Server-enforced submission cutoff: trigger executes for every insert, including
-- the privileged grading RPC, so changing the client clock cannot bypass it.
create or replace function public.veritashub_enforce_quiz_deadline()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_deadline timestamptz;
begin
 select deadline_at into v_deadline from public.veritashub_quizzes where id=new.quiz_id;
 if v_deadline is not null and pg_catalog.clock_timestamp() >= v_deadline then
  raise exception 'Quiz submission deadline has passed';
 end if;
 return new;
end $$;
revoke all on function public.veritashub_enforce_quiz_deadline() from public,anon,authenticated;
drop trigger if exists veritashub_quiz_deadline_guard on public.veritashub_quiz_attempts;
create trigger veritashub_quiz_deadline_guard
 before insert on public.veritashub_quiz_attempts
 for each row execute function public.veritashub_enforce_quiz_deadline();
