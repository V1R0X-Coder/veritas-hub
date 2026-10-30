-- Add bounded per-question marks without modifying existing submissions.
alter table public.veritashub_quiz_questions
  add column if not exists marks integer not null default 1
  check (marks between 1 and 100);
-- Published quizzes with attempts must not have their scoring weights changed.
create or replace function public.veritashub_lock_assessed_question_marks()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.marks is distinct from old.marks and exists (
    select 1 from public.veritashub_quiz_attempts a where a.quiz_id=old.quiz_id
  ) then
    raise exception 'Question marks cannot change after a submission';
  end if;
  return new;
end $$;
drop trigger if exists veritashub_lock_assessed_question_marks on public.veritashub_quiz_questions;
create trigger veritashub_lock_assessed_question_marks
before update of marks on public.veritashub_quiz_questions
for each row execute function public.veritashub_lock_assessed_question_marks();
