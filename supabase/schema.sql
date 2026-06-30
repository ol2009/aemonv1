create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid,
  name text not null,
  intro text not null default '',
  mode text not null check (mode in ('ai', 'basic')),
  created_at timestamptz not null default now()
);

create table if not exists aemons (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  stage int not null default 0 check (stage between 0 and 3),
  xp int not null default 0,
  gauge int not null default 0,
  intimacy int not null default 0,
  alignment text not null default 'none' check (alignment in ('none', 'good', 'evil')),
  status text not null default 'egg' check (status in ('egg', 'alive', 'graduated')),
  is_polluted boolean not null default false,
  pollution_item_id text,
  egg_image_url text,
  stage_images_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  graduated_at timestamptz
);

create table if not exists episodes_master (
  code text primary key,
  title text not null,
  type text not null check (type in ('E', 'V_red', 'V_conflict')),
  axis text not null,
  stage_gate int not null default 0,
  hook_text text not null,
  choices_json jsonb not null default '[]'::jsonb,
  rubric_json jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  is_seed boolean not null default true
);

create table if not exists lesson_contents (
  episode_code text primary key,
  title text not null,
  grade text not null default '초3~4',
  standards_json jsonb not null default '[]'::jsonb,
  objective text not null,
  note text,
  phases_json jsonb not null default '[]'::jsonb,
  slides_json jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists value_codes (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade,
  no int not null check (no > 0),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  unique (class_id, no)
);

create table if not exists class_board_posts (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) on delete cascade,
  nickname text not null,
  body text not null,
  prompt text not null,
  created_at timestamptz not null default now()
);

create table if not exists walk_items (
  id text primary key,
  type text not null check (type in ('good', 'weird', 'plain')),
  content_text text not null,
  image_url text,
  linked_episode_code text references episodes_master(code)
);

create table if not exists pollution_items (
  id text primary key,
  axis text not null,
  label text not null,
  one_liner text not null,
  linked_episode_code text references episodes_master(code)
);

create table if not exists episode_logs (
  id uuid primary key default gen_random_uuid(),
  aemon_id uuid not null references aemons(id) on delete cascade,
  episode_code text not null references episodes_master(code),
  mode text not null check (mode in ('ai', 'basic')),
  student_input_summary text,
  verdict text not null check (verdict in ('good', 'evil', 'gray', 'none')),
  xp_delta int not null default 0,
  gauge_delta int not null default 0,
  teacher_override boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists walk_logs (
  id uuid primary key default gen_random_uuid(),
  aemon_id uuid not null references aemons(id) on delete cascade,
  item_id text not null references walk_items(id),
  created_at timestamptz not null default now()
);

create table if not exists clean_logs (
  id uuid primary key default gen_random_uuid(),
  aemon_id uuid not null references aemons(id) on delete cascade,
  item_id text not null references pollution_items(id),
  created_at timestamptz not null default now()
);

create table if not exists dex (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  aemon_snapshot jsonb not null,
  final_image_url text,
  ending text not null check (ending in ('good', 'evil')),
  graduated_at timestamptz not null default now()
);

alter table lesson_contents enable row level security;
alter table value_codes enable row level security;
alter table class_board_posts enable row level security;

drop policy if exists "lesson contents public read" on lesson_contents;
create policy "lesson contents public read"
  on lesson_contents for select
  using (true);

drop policy if exists "lesson contents public write prototype" on lesson_contents;

drop policy if exists "lesson contents authenticated insert" on lesson_contents;
create policy "lesson contents authenticated insert"
  on lesson_contents for insert
  to authenticated
  with check (true);

drop policy if exists "lesson contents authenticated update" on lesson_contents;
create policy "lesson contents authenticated update"
  on lesson_contents for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "lesson contents authenticated delete" on lesson_contents;
create policy "lesson contents authenticated delete"
  on lesson_contents for delete
  to authenticated
  using (true);

drop policy if exists "value codes public read" on value_codes;
create policy "value codes public read"
  on value_codes for select
  using (true);

drop policy if exists "value codes authenticated write" on value_codes;
create policy "value codes authenticated write"
  on value_codes for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "class board public read" on class_board_posts;
create policy "class board public read"
  on class_board_posts for select
  using (true);

drop policy if exists "class board public insert" on class_board_posts;
create policy "class board public insert"
  on class_board_posts for insert
  with check (
    length(trim(nickname)) between 1 and 16
    and length(trim(body)) between 1 and 280
  );
