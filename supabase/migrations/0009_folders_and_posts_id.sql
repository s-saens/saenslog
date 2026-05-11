-- 블로그: 폴더 트리 + posts.slug 제거 + 댓글 트리거 정리

-- 슬러그 변경 시 댓글 동기화 트리거 (slug 컬럼이 없어지므로 제거)
drop trigger if exists posts_slug_change_sync_comments on public.posts;
drop function if exists public.sync_comments_post_slug();

create table if not exists public.folders (
	id bigserial primary key,
	name text not null,
	posts bigint[] not null default '{}',
	subfolders bigint[] not null default '{}',
	created_at timestamptz not null default now()
);

alter table public.folders enable row level security;

create policy "folders read" on public.folders for select using (true);

create policy "folders admin insert" on public.folders for insert with check (
	exists (
		select 1
		from public.profiles p
		where
			p.id = auth.uid()
			and p.role = 'admin'
	)
);

create policy "folders admin update" on public.folders for update using (
	exists (
		select 1
		from public.profiles p
		where
			p.id = auth.uid()
			and p.role = 'admin'
	)
);

create policy "folders admin delete" on public.folders for delete using (
	exists (
		select 1
		from public.profiles p
		where
			p.id = auth.uid()
			and p.role = 'admin'
	)
);

alter table public.posts drop column if exists slug;
