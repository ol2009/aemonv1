create extension if not exists pgcrypto;

alter table classes add column if not exists mode text not null default 'ai' check (mode in ('ai', 'basic'));
alter table classes add column if not exists code text;
alter table classes add column if not exists current_lesson int not null default 1 check (current_lesson between 1 and 7);
alter table classes add column if not exists aemon_name text not null default '';

create unique index if not exists classes_code_unique_idx on classes(code) where code is not null;
create index if not exists classes_code_idx on classes(code);

alter table classes enable row level security;
alter table chat_logs enable row level security;

drop policy if exists "classes public read" on classes;
create policy "classes public read" on classes for select using (true);

drop policy if exists "classes public insert" on classes;
create policy "classes public insert" on classes
  for insert with check (length(trim(name)) between 1 and 50 and length(trim(code)) between 4 and 6);

drop policy if exists "classes public update" on classes;
create policy "classes public update" on classes
  for update using (true)
  with check (length(trim(name)) between 1 and 50 and current_lesson between 1 and 7 and length(trim(aemon_name)) <= 12);

drop policy if exists "chat logs public read" on chat_logs;
create policy "chat logs public read" on chat_logs for select using (true);

drop policy if exists "chat logs public insert" on chat_logs;
create policy "chat logs public insert" on chat_logs
  for insert with check (length(trim(question)) between 1 and 500 and length(trim(answer)) between 1 and 3000);
