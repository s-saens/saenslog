import { createServerClient } from '@supabase/ssr';
import { env as publicEnv } from '$env/dynamic/public';
import type { RequestEvent } from '@sveltejs/kit';

/** CI·로컬 빌드용(프로덕션에서는 .env에 실제 Publishable 키 필수) */
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackPublishableKey = 'sb_publishable_ci_build_placeholder_not_valid';

/** Publishable(sb_publishable_…) 우선, 전환 기간 레거시 anon JWT 폴백 */
function resolvePublicSupabaseKey(): string {
	return (
		publicEnv.PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
		publicEnv.PUBLIC_SUPABASE_ANON_KEY ??
		fallbackPublishableKey
	);
}

export function createSupabaseServer(event: RequestEvent) {
	const supabaseUrl = publicEnv.PUBLIC_SUPABASE_URL ?? fallbackUrl;
	const supabaseKey = resolvePublicSupabaseKey();

	return createServerClient(supabaseUrl, supabaseKey, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet, headers) => {
				for (const { name, value, options } of cookiesToSet) {
					event.cookies.set(name, value, { ...options, path: '/' });
				}
				if (Object.keys(headers).length > 0) {
					event.setHeaders(headers);
				}
			}
		}
	});
}
