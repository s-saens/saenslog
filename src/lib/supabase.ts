import { createBrowserClient } from '@supabase/ssr';
import { env } from '$env/dynamic/public';

const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackPublishableKey = 'sb_publishable_ci_build_placeholder_not_valid';

function resolvePublicSupabaseKey(): string {
	return (
		env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
		env.PUBLIC_SUPABASE_ANON_KEY ??
		fallbackPublishableKey
	);
}

export const supabase = createBrowserClient(
	env.PUBLIC_SUPABASE_URL ?? fallbackUrl,
	resolvePublicSupabaseKey()
);
