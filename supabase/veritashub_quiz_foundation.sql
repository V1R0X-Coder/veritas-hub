-- Objective quiz foundation. Answer keys are never readable through the REST API.
create table if not exists public.veritashub_quizzes (
 id uuid primary key default gen_random_uuid(),
 class_id uuid not null references public.veritashub_classes(id) on delete cascade,
 lecturer_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (length(title) between 3 and 160),
 published boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.veritashub_quiz_questions (
 id uuid primary key default gen_random_uuid(),
 quiz_id uuid not null references public.veritashub_quizzes(id) on delete cascade,
 prompt text not null check(length(prompt) between 3 and 2000),
 options jsonb not null check(jsonb_typeof(options)='array' and jsonb_array_length(options)=4),
 correct_index integer not null check(correct_index between 0 and 3),
 position integer not null default 0
);
alter table public.veritashub_quizzes enable row level security;
alter table public.veritashub_quiz_questions enable row level security;
revoke all on public.veritashub_quizzes,public.veritashub_quiz_questions from anon,authenticated;
grant select,insert on public.veritashub_quizzes to authenticated;
grant insert on public.veritashub_quiz_questions to authenticated;
create policy "veritashub_quiz_catalog" on public.veritashub_quizzes for select to authenticated using (
 (published and exists(select 1 from public.veritashub_class_enrollments e where e.class_id=veritashub_quizzes.class_id and e.user_id=(select auth.uid())))
 or (lecturer_id=(select auth.uid()) and exists(select 1 from public.veritashub_lecturer_classes lc join public.veritashub_lecturers l on l.user_id=lc.lecturer_id where lc.class_id=veritashub_quizzes.class_id and lc.lecturer_id=(select auth.uid()) and l.active))
);
create policy "veritashub_quiz_create" on public.veritashub_quizzes for insert to authenticated with check (
 lecturer_id=(select auth.uid()) and exists(select 1 from public.veritashub_lecturer_classes lc join public.veritashub_lecturers l on l.user_id=lc.lecturer_id where lc.class_id=veritashub_quizzes.class_id and lc.lecturer_id=(select auth.uid()) and l.active)
);
create policy "veritashub_quiz_question_create" on public.veritashub_quiz_questions for insert to authenticated with check (
 exists(select 1 from public.veritashub_quizzes q join public.veritashub_lecturer_classes lc on lc.class_id=q.class_id and lc.lecturer_id=q.lecturer_id join public.veritashub_lecturers l on l.user_id=q.lecturer_id where q.id=quiz_id and q.lecturer_id=(select auth.uid()) and l.active and not q.published)
);
-- Publishing will require a reviewed server-side action in the next increment.
