import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

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
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
		}
		interface PageData {
			session?: Session | null;
			user?: User | null;
			profile?: Profile | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
