import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { SeoPayload } from '$lib/seo';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

declare global {
	namespace App {
		// interface Error {}
		interface Profile {
			username: string;
			display_name: string | null;
			avatar_url: string | null;
			role: 'admin' | 'member';
		}
		interface Locals {
			supabase: SupabaseClient;
			safeGetUser: () => Promise<User | null>;
		}
		interface SeoDefaults {
			siteUrl: string;
			siteName: string;
			defaultDescription: string;
			defaultOgImagePath: string;
			locale: string;
		}
		interface PageData {
			session?: Session | null;
			user?: User | null;
			profile?: Profile | null;
			seoDefaults?: App.SeoDefaults;
			seo?: SeoPayload;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
