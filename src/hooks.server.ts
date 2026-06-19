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
			// Cloudflare 엣지 캐시(Cache API). dev(Node)에는 caches 전역이 없으므로 가드한다.
			// `caches.default`는 Cloudflare 런타임 확장(표준 CacheStorage엔 없음)이라 캐스팅한다.
			const cache =
				typeof caches !== 'undefined' ? (caches as unknown as { default: Cache }).default : null;
			const cacheKey = cache ? new Request(new URL(event.request.url).toString()) : null;

			if (cache && cacheKey) {
				const hit = await cache.match(cacheKey);
				if (hit) return hit;
			}

			const media = await mediaStore().get(key);
			if (media) {
				const headers = new Headers({
					'Content-Type': media.contentType ?? contentType,
					'Content-Length': String(media.size),
					// 미디어 키는 변경되지 않으므로 immutable로 재검증 생략
					'Cache-Control': 'public, max-age=31536000, immutable',
					'Accept-Ranges': 'bytes'
				});
				if (media.etag) headers.set('ETag', media.etag);

				const response = new Response(media.body, { headers });
				// 응답을 엣지에 저장(다음 요청부터 R2 안 거치고 엣지에서 서빙)
				if (cache && cacheKey) {
					event.platform?.context?.waitUntil(cache.put(cacheKey, response.clone()));
				}
				return response;
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
