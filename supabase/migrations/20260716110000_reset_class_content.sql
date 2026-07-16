create or replace function public.reset_class_content(target_class_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.classes
    where id = target_class_id and teacher_id = auth.uid()
  ) then
    raise exception 'class reset is restricted to the owner';
  end if;

  delete from public.post_votes where class_id = target_class_id;
  delete from public.code_votes where class_id = target_class_id;
  delete from public.name_votes where class_id = target_class_id;
  delete from public.chat_logs where class_id = target_class_id;
  delete from public.codes where class_id = target_class_id;
  delete from public.survey_responses where class_id = target_class_id;
  delete from public.wishes where class_id = target_class_id;
  delete from public.name_candidates where class_id = target_class_id;

  update public.classes
  set current_lesson = 1, aemon_name = ''
  where id = target_class_id;
end;
$$;

revoke all on function public.reset_class_content(uuid) from public;
grant execute on function public.reset_class_content(uuid) to authenticated;
