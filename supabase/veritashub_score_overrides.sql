-- Audit every lecturer score override; never overwrite the original graded score.
create table if not exists public.veritashub_score_overrides (
 id uuid primary key default gen_random_uuid(),
 quiz_id uuid not null,
 student_id uuid not null,
 lecturer_id uuid not null references auth.users(id),
 previous_score integer not null check(previous_score >= 0),
 revised_score integer not null check(revised_score >= 0),
 total integer not null check(total > 0),
 reason text not null check(char_length(trim(reason)) between 10 and 1000),
 created_at timestamptz not null default now(),
 foreign key(quiz_id,student_id) references public.veritashub_quiz_attempts(quiz_id,student_id) on delete restrict,
 check(revised_score <= total)
);
create index if not exists veritashub_score_overrides_attempt_idx
 on public.veritashub_score_overrides(quiz_id,student_id,created_at desc);
alter table public.veritashub_score_overrides enable row level security;
revoke all on public.veritashub_score_overrides from public,anon,authenticated;
grant select on public.veritashub_score_overrides to authenticated;
create policy "veritashub_score_overrides_student_read" on public.veritashub_score_overrides
 for select to authenticated using(student_id=(select auth.uid()));
create policy "veritashub_score_overrides_lecturer_read" on public.veritashub_score_overrides
 for select to authenticated using(
 lecturer_id=(select auth.uid()) and exists(
 select 1 from public.veritashub_quizzes q
 join public.veritashub_lecturers l on l.user_id=q.lecturer_id and l.active
 join public.veritashub_lecturer_classes lc on lc.lecturer_id=q.lecturer_id and lc.class_id=q.class_id
 where q.id=quiz_id and q.lecturer_id=(select auth.uid())));
create or replace function public.veritashub_override_score(
 p_quiz uuid,p_student uuid,p_score integer,p_reason text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_attempt public.veritashub_quiz_attempts%rowtype; v_id uuid;
begin
 if v_user is null or not exists(
 select 1 from public.veritashub_quizzes q
 join public.veritashub_lecturers l on l.user_id=q.lecturer_id and l.active
 join public.veritashub_lecturer_classes lc on lc.lecturer_id=q.lecturer_id and lc.class_id=q.class_id
 where q.id=p_quiz and q.lecturer_id=v_user
 ) then raise exception 'Not authorized'; end if;
 select * into v_attempt from public.veritashub_quiz_attempts
 where quiz_id=p_quiz and student_id=p_student for update;
 if not found then raise exception 'Submission not found'; end if;
 if p_score is null or p_score<0 or p_score>v_attempt.total
 or p_reason is null or char_length(trim(p_reason)) not between 10 and 1000
 then raise exception 'Invalid score or reason'; end if;
 insert into public.veritashub_score_overrides
 (quiz_id,student_id,lecturer_id,previous_score,revised_score,total,reason)
 values(p_quiz,p_student,v_user,
 coalesce((select revised_score from public.veritashub_score_overrides
 where quiz_id=p_quiz and student_id=p_student order by created_at desc,id desc limit 1),v_attempt.score),
 p_score,v_attempt.total,trim(p_reason)) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.veritashub_override_score(uuid,uuid,integer,text) from public,anon;
grant execute on function public.veritashub_override_score(uuid,uuid,integer,text) to authenticated;
