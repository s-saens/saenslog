import { readFile } from 'node:fs/promises';
import { createSupabaseServer } from '$lib/server/supabase';
import type { Handle } from '@sveltejs/kit';
import path from 'node:path';

const MEDIA_MIME_TYPES: Record<string, string> = {
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.svg': 'image/svg+xml',
	'.avif': 'image/avif',
	'.mp3': 'audio/mpeg',
	'.ogg': 'audio/ogg',
	'.wav': 'audio/wav',
	'.m4a': 'audio/mp4',
	'.aac': 'audio/aac',
	'.flac': 'audio/flac'
};

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

	// /blog/<id>/ 미디어 파일은 런타임에 생성된 정적 자산 서빙
	const url = new URL(event.request.url);
	const pathname = url.pathname;

	if (pathname.startsWith('/blog/') && pathname.length > 6) {
		const segments = pathname.slice(6).split('/');
		const lastSegment = segments[segments.length - 1] || '';
		const hasExtension = /\.[a-z0-9]+$/i.test(lastSegment);

		if (hasExtension) {
			const sanitizedPath = decodeURIComponent(pathname).replace(/\.\./g, '');
			if (!sanitizedPath.includes('..')) {
				const filePath = path.join(process.cwd(), 'static', sanitizedPath);
				const ext = path.extname(filePath).toLowerCase();

				if (MEDIA_MIME_TYPES[ext]) {
					try {
						const buffer = await readFile(filePath);
						return new Response(buffer, {
							headers: {
								'Content-Type': MEDIA_MIME_TYPES[ext],
								'Cache-Control': 'public, max-age=31536000'
							}
						});
					} catch {
						// 파일이 없으면 일반 resolve 진행
					}
				}
			}
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
