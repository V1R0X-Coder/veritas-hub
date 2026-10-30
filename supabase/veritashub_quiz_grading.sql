-- Quiz publishing and server-graded submissions.
-- Never grant direct student SELECT on veritashub_quiz_questions.
create table if not exists public.veritashub_quiz_attempts (
 quiz_id uuid not null references public.veritashub_quizzes(id) on delete cascade,
 student_id uuid not null references auth.users(id) on delete cascade,
 answers jsonb not null check(jsonb_typeof(answers)='object'),
 score integer not null check(score>=0),
 total integer not null check(total>0),
 submitted_at timestamptz not null default now(),
 primary key(quiz_id,student_id)
);
alter table public.veritashub_quiz_attempts enable row level security;
revoke all on public.veritashub_quiz_attempts from anon,authenticated;
grant select on public.veritashub_quiz_attempts to authenticated;
create policy "veritashub_attempt_own_results" on public.veritashub_quiz_attempts
for select to authenticated using(student_id=(select auth.uid()));
-- Security-definer RPCs are narrowly scoped and check auth.uid() and class membership.
-- Fixed empty search_path prevents object shadowing. Revoke PUBLIC EXECUTE explicitly.
create or replace function public.veritashub_publish_quiz(p_quiz uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid := auth.uid(); v_class uuid;
begin
 if v_user is null then raise exception 'Sign in required'; end if;
 select q.class_id into v_class from public.veritashub_quizzes q
 join public.veritashub_lecturers l on l.user_id=q.lecturer_id and l.active=true
 join public.veritashub_lecturer_classes lc on lc.lecturer_id=q.lecturer_id and lc.class_id=q.class_id
 where q.id=p_quiz and q.lecturer_id=v_user and q.published=false for update of q;
 if v_class is null then raise exception 'Not an authorized unpublished quiz'; end if;
 if not exists(select 1 from public.veritashub_quiz_questions where quiz_id=p_quiz) then
 raise exception 'Quiz requires at least one question'; end if;
 update public.veritashub_quizzes set published=true where id=p_quiz;
 return true;
end $$;
create or replace function public.veritashub_get_quiz_questions(p_quiz uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid := auth.uid(); v_items jsonb;
begin
 if v_user is null or not exists(
 select 1 from public.veritashub_quizzes q
 join public.veritashub_class_enrollments e on e.class_id=q.class_id
 where q.id=p_quiz and q.published=true and e.user_id=v_user
 ) then raise exception 'Not enrolled in this published quiz'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'prompt',prompt,'options',options)
 order by position,id),'[]'::jsonb) into v_items
 from public.veritashub_quiz_questions where quiz_id=p_quiz;
 return v_items;
end $$;
create or replace function public.veritashub_submit_quiz(p_quiz uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid := auth.uid(); v_total integer; v_score integer;
begin
 if v_user is null or jsonb_typeof(p_answers) is distinct from 'object' or not exists(
 select 1 from public.veritashub_quizzes q
 join public.veritashub_class_enrollments e on e.class_id=q.class_id
 where q.id=p_quiz and q.published=true and e.user_id=v_user
 ) then raise exception 'Not authorized to submit this quiz'; end if;
 if exists(select 1 from public.veritashub_quiz_attempts where quiz_id=p_quiz and student_id=v_user)
 then raise exception 'This quiz has already been submitted'; end if;
 select count(*)::integer,
 count(*) filter(where p_answers->>id::text=correct_index::text)::integer
 into v_total,v_score from public.veritashub_quiz_questions where quiz_id=p_quiz;
 if v_total<1 or v_total>100 then raise exception 'Quiz unavailable'; end if;
 if (select count(*) from jsonb_object_keys(p_answers))<>v_total then
 raise exception 'Answer every question exactly once'; end if;
 if exists(select 1 from jsonb_each_text(p_answers) a
 where a.key not in (select id::text from public.veritashub_quiz_questions where quiz_id=p_quiz)
 or a.value not in ('0','1','2','3')) then raise exception 'Invalid answers'; end if;
 insert into public.veritashub_quiz_attempts(quiz_id,student_id,answers,score,total)
 values(p_quiz,v_user,p_answers,v_score,v_total);
 return jsonb_build_object('score',v_score,'total',v_total);
end $$;
revoke all on function public.veritashub_publish_quiz(uuid) from public,anon;
revoke all on function public.veritashub_get_quiz_questions(uuid) from public,anon;
revoke all on function public.veritashub_submit_quiz(uuid,jsonb) from public,anon;
grant execute on function public.veritashub_publish_quiz(uuid) to authenticated;
grant execute on function public.veritashub_get_quiz_questions(uuid) to authenticated;
grant execute on function public.veritashub_submit_quiz(uuid,jsonb) to authenticated;
