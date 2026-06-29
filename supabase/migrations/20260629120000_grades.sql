-- "Grades" — a teacher creates a named grade tied to ONE age band and hand-picks
-- which chapters that grade includes; children are added into a grade and see
-- exactly that grade's chapters.
--
-- Additive + OPTIONAL by design: learners.grade_id is nullable, so a child with
-- no grade keeps today's behavior (all chapters in their age band). Nothing
-- existing breaks; the live age-band flow is untouched.

-- 1) grades — one row per (account, grade). Owns a band + (via grade_chapters)
--    a chapter subset.
create table if not exists public.grades (
  id          uuid        primary key default gen_random_uuid(),
  created_by  uuid        not null references auth.users(id) on delete cascade,
  name        text        not null check (char_length(trim(name)) between 1 and 60),
  age_group   text        not null check (age_group in ('3-5','6-8','9-11','12-14','15-16','17-18')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists grades_created_by_idx on public.grades(created_by);

-- 2) grade_chapters — which chapters belong to a grade, in the teacher's order.
--    FK to chapters(id) guarantees only real, seeded chapters can be picked.
create table if not exists public.grade_chapters (
  grade_id    uuid not null references public.grades(id)   on delete cascade,
  chapter_id  text not null references public.chapters(id) on delete cascade,
  sort_order  int  not null default 0,
  primary key (grade_id, chapter_id)
);
create index if not exists grade_chapters_grade_idx on public.grade_chapters(grade_id);

-- 3) learners.grade_id — nullable is what makes grades OPTIONAL. A child in a
--    grade sees grade_chapters; NULL keeps the age-band default. ON DELETE SET
--    NULL: deleting a grade reverts its children to the band default and never
--    destroys learner data.
alter table public.learners
  add column if not exists grade_id uuid references public.grades(id) on delete set null;
create index if not exists learners_grade_id_idx on public.learners(grade_id);

-- 4) RLS — a grade and its chapters are private to the account that made them.
--    SELECT also allows any account with access to a learner assigned to the
--    grade (shared/viewer learners), so the menu can resolve their chapters.
--    Writes stay owner-only.
alter table public.grades enable row level security;

drop policy if exists "grades: select" on public.grades;
create policy "grades: select" on public.grades for select
  using (
    created_by = (select auth.uid())
    or id in (
      select l.grade_id from public.learners l
      join public.learner_access la on la.learner_id = l.id
      where la.parent_id = (select auth.uid()) and l.grade_id is not null
    )
  );

drop policy if exists "grades: insert" on public.grades;
create policy "grades: insert" on public.grades for insert
  with check (created_by = (select auth.uid()));

drop policy if exists "grades: update" on public.grades;
create policy "grades: update" on public.grades for update
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));

drop policy if exists "grades: delete" on public.grades;
create policy "grades: delete" on public.grades for delete
  using (created_by = (select auth.uid()));

alter table public.grade_chapters enable row level security;

drop policy if exists "grade_chapters: select" on public.grade_chapters;
create policy "grade_chapters: select" on public.grade_chapters for select
  using (
    grade_id in (select id from public.grades where created_by = (select auth.uid()))
    or grade_id in (
      select l.grade_id from public.learners l
      join public.learner_access la on la.learner_id = l.id
      where la.parent_id = (select auth.uid()) and l.grade_id is not null
    )
  );

drop policy if exists "grade_chapters: insert" on public.grade_chapters;
create policy "grade_chapters: insert" on public.grade_chapters for insert
  with check (grade_id in (select id from public.grades where created_by = (select auth.uid())));

drop policy if exists "grade_chapters: delete" on public.grade_chapters;
create policy "grade_chapters: delete" on public.grade_chapters for delete
  using (grade_id in (select id from public.grades where created_by = (select auth.uid())));
-- (no UPDATE policy: a grade's chapter set is edited as delete + re-insert)

-- 5) updated_at touch on grades (mirrors the rest of the schema).
create or replace function public.touch_grades_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_touch_grades on public.grades;
create trigger trg_touch_grades before update on public.grades
  for each row execute function public.touch_grades_updated_at();

-- 6) Integrity: a learner can only be assigned to a grade owned by the SAME
--    account. Blocks pointing a learner at a foreign grade (which would
--    otherwise leak that grade's chapters via the shared-learner SELECT path).
create or replace function public.enforce_grade_ownership()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.grade_id is not null then
    if not exists (
      select 1 from public.grades g
      where g.id = new.grade_id and g.created_by = new.created_by
    ) then
      raise exception 'grade % not owned by this account', new.grade_id using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.enforce_grade_ownership() from public, anon, authenticated;

drop trigger if exists trg_enforce_grade_ownership on public.learners;
create trigger trg_enforce_grade_ownership
  before insert or update of grade_id on public.learners
  for each row execute function public.enforce_grade_ownership();

-- 7) Anti-abuse: cap grades per account (mirrors the learner cap).
create or replace function public.enforce_grade_cap()
returns trigger language plpgsql security definer set search_path = public as $$
declare cnt int;
begin
  select count(*) into cnt from public.grades where created_by = new.created_by;
  if cnt >= 50 then
    raise exception 'Grade limit reached (max 50 per account).' using errcode = 'check_violation';
  end if;
  return new;
end $$;
revoke all on function public.enforce_grade_cap() from public, anon, authenticated;

drop trigger if exists trg_enforce_grade_cap on public.grades;
create trigger trg_enforce_grade_cap before insert on public.grades
  for each row execute function public.enforce_grade_cap();
