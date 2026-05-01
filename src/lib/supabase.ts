import { createBrowserClient } from '@supabase/ssr';
import { env } from '$env/dynamic/public';

const fallbackUrl = 'https://placeholder.supabase.co';
const fallbackAnonKey =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.ci-build-placeholder-not-for-production';

export const supabase = createBrowserClient(
	env.PUBLIC_SUPABASE_URL ?? fallbackUrl,
	env.PUBLIC_SUPABASE_ANON_KEY ?? fallbackAnonKey
);
