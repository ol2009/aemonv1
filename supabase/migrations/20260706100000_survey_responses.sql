create extension if not exists pgcrypto;

create table if not exists survey_responses (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  nickname text not null,
  question_key text not null,
  body text not null,
  created_at timestamptz not null default now(),
  unique (class_id, nickname, question_key)
);

create index if not exists survey_responses_class_created_idx on survey_responses(class_id, created_at desc);

alter table survey_responses enable row level security;

drop policy if exists "survey responses public read" on survey_responses;
create policy "survey responses public read" on survey_responses for select using (true);

drop policy if exists "survey responses public insert" on survey_responses;
create policy "survey responses public insert" on survey_responses
  for insert with check (length(trim(nickname)) between 1 and 16 and length(trim(question_key)) between 1 and 60 and length(trim(body)) between 1 and 600);

drop policy if exists "survey responses public update" on survey_responses;
create policy "survey responses public update" on survey_responses
  for update using (true) with check (length(trim(nickname)) between 1 and 16 and length(trim(question_key)) between 1 and 60 and length(trim(body)) between 1 and 600);
