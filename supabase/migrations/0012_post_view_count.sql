-- 공개 글 조회수 (posts.view_count + SECURITY DEFINER RPC)

alter table public.posts add column if not exists view_count bigint not null default 0;

comment on column public.posts.view_count is '공개 글 페이지 SSR 로드 시 증가';

create or replace function public.increment_post_view(post_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
	new_count bigint;
begin
	update public.posts
	set view_count = view_count + 1
	where
		id = post_id
		and published = true
	returning view_count into new_count;

	if new_count is not null then
		return new_count;
	end if;

	return 0;
end;
$$;

comment on function public.increment_post_view(bigint) is '공개(published) 글만 +1 후 현재 조회수 반환';

revoke all on function public.increment_post_view(bigint) from public;
grant execute on function public.increment_post_view(bigint) to anon, authenticated;
