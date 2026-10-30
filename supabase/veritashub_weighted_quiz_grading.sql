-- Preserve quiz enrollment and one-attempt checks while grading weighted questions.
create or replace function public.veritashub_submit_quiz(p_quiz uuid,p_answers jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid := auth.uid(); v_total integer; v_score integer; v_count integer;
begin
 if v_user is null or jsonb_typeof(p_answers) is distinct from 'object' or not exists(
 select 1 from public.veritashub_quizzes q
 join public.veritashub_class_enrollments e on e.class_id=q.class_id
 where q.id=p_quiz and q.published=true and e.user_id=v_user
 ) then raise exception 'Not authorized to submit this quiz'; end if;
 if exists(select 1 from public.veritashub_quiz_attempts where quiz_id=p_quiz and student_id=v_user)
 then raise exception 'This quiz has already been submitted'; end if;
 select coalesce(sum(marks),0)::integer,
 coalesce(sum(marks) filter(where p_answers->>id::text=correct_index::text),0)::integer
 into v_total,v_score from public.veritashub_quiz_questions where quiz_id=p_quiz;
 select count(*) into v_count from public.veritashub_quiz_questions where quiz_id=p_quiz;
 if v_count<1 or v_count>100 then raise exception 'Quiz unavailable'; end if;
 if (select count(*) from jsonb_object_keys(p_answers))<>v_count then
 raise exception 'Answer every question exactly once'; end if;
 if exists(select 1 from jsonb_each_text(p_answers) a
 where a.key not in (select id::text from public.veritashub_quiz_questions where quiz_id=p_quiz)
 or a.value not in ('0','1','2','3')) then raise exception 'Invalid answers'; end if;
 insert into public.veritashub_quiz_attempts(quiz_id,student_id,answers,score,total)
 values(p_quiz,v_user,p_answers,v_score,v_total);
 return jsonb_build_object('score',v_score,'total',v_total);
end $$;
