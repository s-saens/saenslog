-- 목록·표시용 선택 슬러그 (공개 URL은 /blog/{id} 유지)
alter table public.posts add column if not exists slug text;

comment on column public.posts.slug is '블로그 카드 등에 표시할 선택적 짧은 식별자';
