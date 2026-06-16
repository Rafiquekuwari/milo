-- 6–8 chapter #4: Story Problems. Row mirrors the code registry so progress
-- (FK → chapters.id) can be saved for it.
insert into public.chapters (id, name, emoji, sort_order, age_groups) values
  ('storyProblems', 'Story Problems', '📖', 15, array['6-8'])
on conflict (id) do update set
  name = excluded.name, emoji = excluded.emoji,
  sort_order = excluded.sort_order, age_groups = excluded.age_groups;
