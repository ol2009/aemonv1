create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid,
  name text not null,
  code text not null unique,
  current_lesson int not null default 1 check (current_lesson between 1 and 7),
  aemon_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now(),
  unique (class_id, nickname)
);

create table if not exists name_candidates (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid references students(id) on delete set null,
  nickname text not null,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists name_votes (
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  candidate_id uuid not null references name_candidates(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create table if not exists wishes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid references students(id) on delete set null,
  nickname text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists codes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid references students(id) on delete set null,
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
  student_id uuid not null references students(id) on delete cascade,
  code_id uuid not null references codes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, student_id)
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

create index if not exists classes_code_idx on classes(code);
create index if not exists codes_class_status_idx on codes(class_id, status);
create index if not exists chat_logs_class_created_idx on chat_logs(class_id, created_at desc);

alter table classes enable row level security;
alter table students enable row level security;
alter table name_candidates enable row level security;
alter table name_votes enable row level security;
alter table wishes enable row level security;
alter table codes enable row level security;
alter table code_votes enable row level security;
alter table chat_logs enable row level security;

drop policy if exists "classes public read by code" on classes;
create policy "classes public read by code" on classes for select using (true);

drop policy if exists "classes authenticated write" on classes;
create policy "classes authenticated write" on classes for all to authenticated using (true) with check (true);

drop policy if exists "students public read" on students;
create policy "students public read" on students for select using (true);

drop policy if exists "students public insert" on students;
create policy "students public insert" on students for insert with check (length(trim(nickname)) between 1 and 16);

drop policy if exists "name candidates public" on name_candidates;
create policy "name candidates public" on name_candidates for all using (true) with check (length(trim(name)) between 1 and 12);

drop policy if exists "name votes public" on name_votes;
create policy "name votes public" on name_votes for all using (true) with check (true);

drop policy if exists "wishes public" on wishes;
create policy "wishes public" on wishes for all using (true) with check (length(trim(body)) between 1 and 160);

drop policy if exists "codes public read" on codes;
create policy "codes public read" on codes for select using (true);

drop policy if exists "codes public insert" on codes;
create policy "codes public insert" on codes for insert with check (length(trim(body)) between 1 and 180 and length(trim(reason)) between 1 and 180);

drop policy if exists "codes authenticated update" on codes;
create policy "codes authenticated update" on codes for update to authenticated using (true) with check (true);

drop policy if exists "code votes public" on code_votes;
create policy "code votes public" on code_votes for all using (true) with check (true);

drop policy if exists "chat logs authenticated" on chat_logs;
create policy "chat logs authenticated" on chat_logs for all to authenticated using (true) with check (true);
