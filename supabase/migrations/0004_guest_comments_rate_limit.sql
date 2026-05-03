-- 비회원 댓글 + IP 단위 짧은 기간 과다 시도 시 5일 차단

alter table public.comments drop constraint if exists comments_author_or_guest;

alter table public.comments alter column author_id drop not null;

alter table public.comments add column if not exists guest_name text;

alter table public.comments add constraint comments_author_or_guest check (
	(author_id is not null and guest_name is null)
	or (
		author_id is null
		and guest_name is not null
		and char_length(trim(guest_name)) >= 1
		and char_length(trim(guest_name)) <= 40
	)
);

create table if not exists public.comment_ip_blocks (
	ip_hash text primary key,
	blocked_until timestamptz not null
);

create table if not exists public.comment_submit_attempts (
	id bigserial primary key,
	ip_hash text not null,
	attempted_at timestamptz not null default now()
);

create index if not exists comment_submit_attempts_ip_attempted_at_idx
	on public.comment_submit_attempts (ip_hash, attempted_at desc);

alter table public.comment_ip_blocks enable row level security;
alter table public.comment_submit_attempts enable row level security;
