-- Veritas Hub only: grant verified lecturers read/update on their own unpublished questions.
grant select, update (prompt, options, correct_index) on public.veritashub_quiz_questions to authenticated;
create policy "veritashub_draft_question_read" on public.veritashub_quiz_questions
for select to authenticated using (
 exists (select 1 from public.veritashub_quizzes q
 join public.veritashub_lecturer_classes lc on lc.class_id=q.class_id and lc.lecturer_id=q.lecturer_id
 join public.veritashub_lecturers l on l.user_id=q.lecturer_id
 where q.id=quiz_id and q.lecturer_id=(select auth.uid()) and l.active and not q.published)
);
create policy "veritashub_draft_question_update" on public.veritashub_quiz_questions
for update to authenticated
using (exists (select 1 from public.veritashub_quizzes q
 join public.veritashub_lecturer_classes lc on lc.class_id=q.class_id and lc.lecturer_id=q.lecturer_id
 join public.veritashub_lecturers l on l.user_id=q.lecturer_id
 where q.id=quiz_id and q.lecturer_id=(select auth.uid()) and l.active and not q.published))
with check (exists (select 1 from public.veritashub_quizzes q
 join public.veritashub_lecturer_classes lc on lc.class_id=q.class_id and lc.lecturer_id=q.lecturer_id
 join public.veritashub_lecturers l on l.user_id=q.lecturer_id
 where q.id=quiz_id and q.lecturer_id=(select auth.uid()) and l.active and not q.published));
