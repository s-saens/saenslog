-- 폴더 INSERT/UPDATE 시 프로필 서브쿼리·RLS 조합으로 거절되는 경우를 줄이기 위해
-- 관리자 판별을 SECURITY DEFINER 함수로 통일한다. (호출자 JWT의 auth.uid()는 그대로 유지)

create or replace function public.is_blog_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.profiles p
		where p.id = auth.uid()
			and p.role = 'admin'
	);
$$;

comment on function public.is_blog_admin() is 'RLS: 블로그 폴더 등 관리 작업용 관리자 여부';

revoke all on function public.is_blog_admin() from public;
grant execute on function public.is_blog_admin() to authenticated;

drop policy if exists "folders admin insert" on public.folders;
drop policy if exists "folders admin update" on public.folders;
drop policy if exists "folders admin delete" on public.folders;

-- 로그인 사용자만 시도 (anon은 항상 false)
create policy "folders admin insert" on public.folders
	for insert
	to authenticated
	with check (public.is_blog_admin());

create policy "folders admin update" on public.folders
	for update
	to authenticated
	using (public.is_blog_admin())
	with check (public.is_blog_admin());

create policy "folders admin delete" on public.folders
	for delete
	to authenticated
	using (public.is_blog_admin());
