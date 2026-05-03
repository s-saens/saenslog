import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env as privateEnv } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

/** 서버 전용 Secret(service_role). RLS 우회 삽입(비회원 댓글·차단 테이블)에만 사용. */
export function tryCreateSupabaseServiceClient(): SupabaseClient | null {
	const url = publicEnv.PUBLIC_SUPABASE_URL;
	const key = privateEnv.SUPABASE_SECRET_KEY;
	if (!url || !key) return null;

	return createClient(url, key, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
}
