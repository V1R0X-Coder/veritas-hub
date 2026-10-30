-- Answer keys remain inaccessible to students until a lecturer chooses release.
alter table public.veritashub_quizzes
 add column if not exists answer_key_release_at timestamptz;
create or replace function public.veritashub_get_released_answer_key(p_quiz uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_items jsonb;
begin
 if v_user is null or not exists(
 select 1 from public.veritashub_quizzes q
 join public.veritashub_class_enrollments e on e.class_id=q.class_id
 join public.veritashub_quiz_attempts a on a.quiz_id=q.id and a.student_id=v_user
 where q.id=p_quiz and q.published and e.user_id=v_user
 and q.answer_key_release_at is not null
 and pg_catalog.clock_timestamp() >= q.answer_key_release_at
 ) then raise exception 'Answer key is not released for this student'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
 'question_id',id,'correct_index',correct_index,'marks',marks)
 order by position,id),'[]'::jsonb) into v_items
 from public.veritashub_quiz_questions where quiz_id=p_quiz;
 return v_items;
end $$;
revoke all on function public.veritashub_get_released_answer_key(uuid) from public,anon;
grant execute on function public.veritashub_get_released_answer_key(uuid) to authenticated;
