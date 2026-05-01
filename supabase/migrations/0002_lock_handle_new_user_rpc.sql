-- PostgREST RPC 로 handle_new_user 가 노출되지 않도록 (Supabase advisor 0028/0029)
-- auth.users 트리거 실행에는 영향 없음
revoke execute on function public.handle_new_user () from public;

revoke execute on function public.handle_new_user () from anon, authenticated;
