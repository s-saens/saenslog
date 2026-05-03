-- posts: category, tags 제거 (분류는 slug 경로로만 표현)
alter table public.posts drop column if exists category;
alter table public.posts drop column if exists tags;
