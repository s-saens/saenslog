-- Realtime: 댓글 테이블 변경 구독 (클라이언트 postgres_changes)
alter publication supabase_realtime add table public.comments;
