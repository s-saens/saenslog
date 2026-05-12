-- 글·댓글 하트(좋아요) — IP 또는 로그인 사용자당 대상 1회, IP 기반 토글 빈도 제한

create table if not exists public.post_likes (
	id bigserial primary key,
	post_id bigint not null references public.posts (id) on delete cascade,
	user_id uuid references auth.users (id) on delete cascade,
	ip_hash text,
	created_at timestamptz not null default now(),
	constraint post_likes_identity check (
		(user_id is not null and ip_hash is null)
		or (user_id is null and ip_hash is not null)
	)
);

create unique index if not exists post_likes_post_user_unique on public.post_likes (post_id, user_id)
where
	user_id is not null;

create unique index if not exists post_likes_post_ip_unique on public.post_likes (post_id, ip_hash)
where
	user_id is null;

create index if not exists post_likes_post_id_idx on public.post_likes (post_id);

create table if not exists public.comment_likes (
	id bigserial primary key,
	comment_id bigint not null references public.comments (id) on delete cascade,
	user_id uuid references auth.users (id) on delete cascade,
	ip_hash text,
	created_at timestamptz not null default now(),
	constraint comment_likes_identity check (
		(user_id is not null and ip_hash is null)
		or (user_id is null and ip_hash is not null)
	)
);

create unique index if not exists comment_likes_comment_user_unique on public.comment_likes (comment_id, user_id)
where
	user_id is not null;

create unique index if not exists comment_likes_comment_ip_unique on public.comment_likes (comment_id, ip_hash)
where
	user_id is null;

create index if not exists comment_likes_comment_id_idx on public.comment_likes (comment_id);

-- 좋아요 토글(추가·취소) 시도 기록 — IP당 롤링 윈도우
create table if not exists public.like_action_attempts (
	id bigserial primary key,
	ip_hash text not null,
	attempted_at timestamptz not null default now()
);

create index if not exists like_action_attempts_ip_attempted_at_idx on public.like_action_attempts (
	ip_hash,
	attempted_at desc
);

alter table public.post_likes enable row level security;

alter table public.comment_likes enable row level security;

alter table public.like_action_attempts enable row level security;

drop policy if exists "post_likes read" on public.post_likes;

create policy "post_likes read" on public.post_likes for select using (true);

drop policy if exists "comment_likes read" on public.comment_likes;

create policy "comment_likes read" on public.comment_likes for select using (true);
