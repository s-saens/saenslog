import { createSupabaseServer } from '$lib/server/supabase';
import { mediaStore, mimeForKey } from '$lib/server/mediaStore';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createSupabaseServer(event);

	// 요청당 한 번만 Supabase 인증 왕복 — layout·page load가 같은 결과를 공유
	let userPromise: ReturnType<App.Locals['safeGetUser']> | null = null;
	event.locals.safeGetUser = () => {
		userPromise ??= (async () => {
			try {
				const {
					data: { user },
					error
				} = await event.locals.supabase.auth.getUser();
				if (error || !user) return null;
				return user;
			} catch (e) {
				console.error('safeGetUser', e);
				return null;
			}
		})();
		return userPromise;
	};

	// /blog/<id>/·/musics/ 미디어 파일은 미디어 저장소(R2, dev에서는 static/)에서 서빙
	const pathname = new URL(event.request.url).pathname;

	if (pathname.startsWith('/blog/') || pathname.startsWith('/musics/')) {
		const key = decodeURIComponent(pathname).slice(1);
		const contentType = !key.includes('..') ? mimeForKey(key) : null;

		if (contentType) {
			const media = await mediaStore().get(key);
			if (media) {
				return new Response(media.body, {
					headers: {
						'Content-Type': media.contentType ?? contentType,
						'Content-Length': String(media.size),
						'Cache-Control': 'public, max-age=31536000'
					}
				});
			}
			// 저장소에 없으면 일반 resolve 진행
		}
	}

	const response = await resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});

	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	return response;
};
