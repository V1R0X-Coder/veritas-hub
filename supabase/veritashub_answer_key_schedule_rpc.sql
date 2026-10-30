-- Lecturer-only scheduling, without granting unrestricted quiz UPDATE to clients.
create or replace function public.veritashub_schedule_answer_key_release(
 p_quiz uuid,p_release_at timestamptz)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null or not exists (
 select 1 from public.veritashub_quizzes q
 join public.veritashub_lecturers l on l.user_id=q.lecturer_id and l.active
 join public.veritashub_lecturer_classes lc on lc.lecturer_id=q.lecturer_id and lc.class_id=q.class_id
 where q.id=p_quiz and q.lecturer_id=v_user
 ) then raise exception 'Not authorized to schedule release'; end if;
 if p_release_at is not null and p_release_at<=pg_catalog.clock_timestamp() then
 raise exception 'Release time must be in the future'; end if;
 update public.veritashub_quizzes set answer_key_release_at=p_release_at where id=p_quiz;
 return true;
end $$;
revoke all on function public.veritashub_schedule_answer_key_release(uuid,timestamptz) from public,anon;
grant execute on function public.veritashub_schedule_answer_key_release(uuid,timestamptz) to authenticated;
