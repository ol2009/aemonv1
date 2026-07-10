create table if not exists public.post_votes (
  class_id uuid not null references public.classes(id) on delete cascade,
  nickname text not null,
  post_type text not null check (post_type in ('wish', 'risk')),
  post_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (class_id, nickname, post_type, post_id)
);

create index if not exists post_votes_class_post_idx
  on public.post_votes(class_id, post_type, post_id);

alter table public.post_votes enable row level security;

drop policy if exists "post votes public" on public.post_votes;
create policy "post votes public" on public.post_votes
  for all
  using (true)
  with check (
    length(trim(nickname)) between 1 and 16
    and post_type in ('wish', 'risk')
  );
