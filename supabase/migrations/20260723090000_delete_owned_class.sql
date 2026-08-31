drop policy if exists "classes owner delete" on public.classes;
create policy "classes owner delete" on public.classes
  for delete to authenticated
  using (teacher_id = auth.uid());

create or replace function public.delete_owned_class(target_class_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if auth.uid() is null then
    raise exception 'class delete requires authentication';
  end if;

  delete from public.classes
  where id = target_class_id
    and teacher_id = auth.uid();

  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

revoke all on function public.delete_owned_class(uuid) from public;
grant execute on function public.delete_owned_class(uuid) to authenticated;
