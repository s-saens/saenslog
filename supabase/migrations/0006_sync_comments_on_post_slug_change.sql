-- 글 슬러그 변경 시 해당 글 댓글의 post_slug 동기화
create or replace function public.sync_comments_post_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if old.slug is distinct from new.slug then
		update public.comments
		set post_slug = new.slug
		where post_slug = old.slug;
	end if;
	return new;
end;
$$;

drop trigger if exists posts_slug_change_sync_comments on public.posts;

create trigger posts_slug_change_sync_comments
after update of slug on public.posts
for each row
when (old.slug is distinct from new.slug)
execute function public.sync_comments_post_slug();
