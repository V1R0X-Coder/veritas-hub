-- Allow authenticated lecturers to edit marks only through the existing draft-only RLS policy.
grant update(marks) on public.veritashub_quiz_questions to authenticated;
