-- Report effective scores without changing the immutable original automatic grade.
create or replace function public.veritashub_lecturer_quiz_results(p_quiz uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_user uuid:=auth.uid(); v_title text;
 v_count integer; v_average numeric; v_best numeric;
begin
 if v_user is null then raise exception 'Sign in required'; end if;
 select q.title into v_title from public.veritashub_quizzes q
 join public.veritashub_lecturers l on l.user_id=q.lecturer_id and l.active=true
 join public.veritashub_lecturer_classes lc on lc.lecturer_id=q.lecturer_id and lc.class_id=q.class_id
 where q.id=p_quiz and q.lecturer_id=v_user;
 if v_title is null then raise exception 'Not authorized to view quiz results'; end if;
 select count(*)::integer,
 round(avg(coalesce(o.revised_score,a.score)::numeric*100/a.total),2),
 max(round(coalesce(o.revised_score,a.score)::numeric*100/a.total,2))
 into v_count,v_average,v_best
 from public.veritashub_quiz_attempts a
 left join lateral (
 select x.revised_score from public.veritashub_score_overrides x
 where x.quiz_id=a.quiz_id and x.student_id=a.student_id
 order by x.created_at desc,x.id desc limit 1
 ) o on true where a.quiz_id=p_quiz;
 return pg_catalog.jsonb_build_object('title',v_title,'submissions',v_count,
 'average_percent',v_average,'highest_percent',v_best);
end $$;
revoke all on function public.veritashub_lecturer_quiz_results(uuid) from public,anon;
grant execute on function public.veritashub_lecturer_quiz_results(uuid) to authenticated;
