import type { SupabaseClient, User } from '@supabase/supabase-js';
import { error } from '@sveltejs/kit';

/** +server.ts 등에서 관리자 세션 확인 (admin 레이아웃은 API에 적용되지 않음) */
export async function requireAdmin(
	supabase: SupabaseClient
): Promise<{ user: User }> {
	const {
		data: { user },
		error: uerr
	} = await supabase.auth.getUser();
	if (uerr || !user) error(401, '로그인이 필요합니다.');

	const { data: profile, error: perr } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (perr || !profile || profile.role !== 'admin') error(403, '관리자만 사용할 수 있습니다.');

	return { user };
}
