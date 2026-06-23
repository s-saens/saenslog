import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * 블로그 관리자 여부(비-throw). `requireAdmin`과 달리 방문자도 허용해야 하는
 * 경로(예: /api/blog-index)에서 공개/비공개 분기에 쓴다. 이미 받아둔 user를 넘겨
 * 중복 getUser 왕복을 피한다.
 */
export async function isBlogAdminUser(
	supabase: SupabaseClient,
	user: User | null
): Promise<boolean> {
	if (!user) return false;
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();
	return profile?.role === 'admin';
}
