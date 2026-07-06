drop policy if exists "classes public insert" on classes;
create policy "classes public insert" on classes
  for insert with check (length(trim(name)) between 1 and 50 and length(trim(code)) between 4 and 6);

drop policy if exists "classes public update" on classes;
create policy "classes public update" on classes
  for update using (true) with check (length(trim(name)) between 1 and 50 and current_lesson between 1 and 7 and length(trim(aemon_name)) <= 12);

drop policy if exists "chat logs public read" on chat_logs;
create policy "chat logs public read" on chat_logs for select using (true);

drop policy if exists "chat logs public insert" on chat_logs;
create policy "chat logs public insert" on chat_logs
  for insert with check (length(trim(question)) between 1 and 500 and length(trim(answer)) between 1 and 3000);
