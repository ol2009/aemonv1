drop policy if exists "classes owner delete" on classes;
create policy "classes owner delete" on classes
  for delete to authenticated
  using (teacher_id = auth.uid());
