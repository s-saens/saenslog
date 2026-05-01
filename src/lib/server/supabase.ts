import { createServerClient } from '@supabase/ssr';
import { env as publicEnv } from '$env/dynamic/public';
import type { RequestEvent } from '@sveltejs/kit';

/** CI·로컬 빌드용(프로덕션에서는 .env에 실제 값 필수) */
const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackAnonKey =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.ci-build-placeholder-not-for-production';

export function createSupabaseServer(event: RequestEvent) {
	const supabaseUrl = publicEnv.PUBLIC_SUPABASE_URL ?? fallbackUrl;
	const supabaseKey = publicEnv.PUBLIC_SUPABASE_ANON_KEY ?? fallbackAnonKey;

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
