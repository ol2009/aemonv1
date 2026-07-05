create extension if not exists pgcrypto;

alter table classes add column if not exists code text;
alter table classes add column if not exists current_lesson int not null default 1 check (current_lesson between 1 and 7);
alter table classes add column if not exists aemon_name text not null default '';

create unique index if not exists classes_code_unique_idx on classes(code) where code is not null;
create index if not exists classes_code_idx on classes(code);

create table if not exists name_candidates (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  nickname text not null,
  name text not null,
  reason text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists name_votes (
  class_id uuid not null references classes(id) on delete cascade,
  nickname text not null,
  candidate_id uuid not null references name_candidates(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, nickname, candidate_id)
);

create table if not exists wishes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  nickname text not null,
  body text not null,
  created_at timestamptz not null default now(),
  unique (class_id, nickname)
);

create table if not exists codes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  nickname text not null,
  body text not null,
  reason text not null,
  value_card text not null default '',
  revision_of_no int,
  status text not null default 'pending' check (status in ('pending', 'adopted', 'rejected')),
  adopted_no int,
  created_at timestamptz not null default now(),
  adopted_at timestamptz
);

create table if not exists code_votes (
  class_id uuid not null references classes(id) on delete cascade,
  nickname text not null,
  code_id uuid not null references codes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, nickname, code_id)
);

create table if not exists chat_logs (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  question text not null,
  answer text not null,
  mode text not null check (mode in ('canned', 'live')),
  prompt_snapshot text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists name_candidates_class_created_idx on name_candidates(class_id, created_at desc);
create index if not exists name_votes_class_candidate_idx on name_votes(class_id, candidate_id);
create index if not exists wishes_class_created_idx on wishes(class_id, created_at desc);
create index if not exists codes_class_status_idx on codes(class_id, status);
create index if not exists code_votes_class_code_idx on code_votes(class_id, code_id);
create index if not exists chat_logs_class_created_idx on chat_logs(class_id, created_at desc);

alter table name_candidates enable row level security;
alter table name_votes enable row level security;
alter table wishes enable row level security;
alter table codes enable row level security;
alter table code_votes enable row level security;
alter table chat_logs enable row level security;

drop policy if exists "name candidates public read" on name_candidates;
create policy "name candidates public read" on name_candidates for select using (true);

drop policy if exists "name candidates public insert" on name_candidates;
create policy "name candidates public insert" on name_candidates
  for insert with check (length(trim(nickname)) between 1 and 16 and length(trim(name)) between 1 and 12);

drop policy if exists "name votes public" on name_votes;
create policy "name votes public" on name_votes for all using (true) with check (length(trim(nickname)) between 1 and 16);

drop policy if exists "wishes public read" on wishes;
create policy "wishes public read" on wishes for select using (true);

drop policy if exists "wishes public insert" on wishes;
create policy "wishes public insert" on wishes
  for insert with check (length(trim(nickname)) between 1 and 16 and length(trim(body)) between 1 and 160);

drop policy if exists "wishes public update" on wishes;
create policy "wishes public update" on wishes
  for update using (true) with check (length(trim(body)) between 1 and 160);

drop policy if exists "wishes authenticated delete" on wishes;
create policy "wishes authenticated delete" on wishes for delete to authenticated using (true);

drop policy if exists "codes public read" on codes;
create policy "codes public read" on codes for select using (true);

drop policy if exists "codes public insert" on codes;
create policy "codes public insert" on codes
  for insert with check (length(trim(nickname)) between 1 and 16 and length(trim(body)) between 1 and 180 and length(trim(reason)) between 1 and 180);

drop policy if exists "codes authenticated update" on codes;
create policy "codes authenticated update" on codes for update to authenticated using (true) with check (true);

drop policy if exists "code votes public" on code_votes;
create policy "code votes public" on code_votes for all using (true) with check (length(trim(nickname)) between 1 and 16);

drop policy if exists "chat logs authenticated" on chat_logs;
create policy "chat logs authenticated" on chat_logs for all to authenticated using (true) with check (true);
