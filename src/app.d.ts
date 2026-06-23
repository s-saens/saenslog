import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { R2Bucket, ExecutionContext, KVNamespace } from '@cloudflare/workers-types';
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
			/** 인증 서버에 JWT를 검증(원격 왕복). 보안 결정(뮤테이션·권한)에 사용. */
			safeGetUser: () => Promise<User | null>;
			/** 쿠키의 세션을 로컬 디코드(무왕복, 서명 미검증). UI 표시 전용. */
			safeGetSession: () => Promise<User | null>;
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
		interface Platform {
			env?: {
				MEDIA: R2Bucket;
				FOLDERS?: KVNamespace;
			};
			context?: ExecutionContext;
			caches?: CacheStorage;
		}
	}
}

export {};
