import { env as publicEnv } from '$env/dynamic/public';

/**
 * 엣지 데이터 캐시 — Cloudflare `caches.default`(Cache API)에 JSON 페이로드를 저장한다.
 * `hooks.server.ts`의 미디어 캐시와 같은 패턴이지만, 응답 바디 대신 load의 "정적 셸"
 * (글 본문 HTML·브레드크럼·태그 등 방문자/시간 비의존 데이터)을 캐시한다.
 *
 * 한계(계획서 1i·3e의 TTL 자가복구 전제):
 * - `caches.default`는 데이터센터(colo)별이라 invalidate가 전역 즉시 반영되지 않는다.
 *   누락분은 짧은 TTL(s-maxage)로 자연 만료시킨다.
 * - dev(Node)에는 `caches` 전역이 없으므로 모든 함수가 no-op로 동작한다.
 */

const DEFAULT_TTL_SECONDS = 300;

// 캐시 키는 자기 존(zone) URL이어야 colo 캐시에 저장된다. 실제 라우트와 겹치지 않도록
// `/__edge-cache/` 프리픽스를 쓴다(이 경로로는 들어오는 요청이 없다).
const KEY_BASE = `${(publicEnv.PUBLIC_SITE_URL ?? 'https://saens.kr').replace(/\/$/, '')}/__edge-cache/`;

type WaitUntil = (p: Promise<unknown>) => void;

/** `caches.default` (Cloudflare 런타임 확장; 표준 CacheStorage엔 없어 캐스팅). dev에선 null. */
function edgeCache(): Cache | null {
	return typeof caches !== 'undefined' ? (caches as unknown as { default: Cache }).default : null;
}

function requestFor(key: string): Request {
	return new Request(KEY_BASE + encodeURIComponent(key));
}

/** 캐시 키 빌더 — 셸/리스팅을 구분하고 스키마 변경 시 버전(v1)을 올린다. */
export const postShellKey = (postId: number) => `post:v1:${postId}`;
export const listingShellKey = (folderKey: number | 'root') =>
	folderKey === 'root' ? 'listing:v1:root' : `listing:v1:f:${folderKey}`;

/** 캐시 히트 시 파싱된 값, 미스/에러/dev면 null. */
export async function readEdgeCache<T>(key: string): Promise<T | null> {
	const cache = edgeCache();
	if (!cache) return null;
	try {
		const hit = await cache.match(requestFor(key));
		if (!hit) return null;
		return (await hit.json()) as T;
	} catch (e) {
		console.warn('[edgeCache] read', key, e);
		return null;
	}
}

/** 값을 TTL과 함께 저장. waitUntil이 있으면 백그라운드, 없으면 await. */
export async function writeEdgeCache<T>(
	key: string,
	value: T,
	opts?: { ttlSeconds?: number; waitUntil?: WaitUntil }
): Promise<void> {
	const cache = edgeCache();
	if (!cache) return;
	const ttl = opts?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
	const res = new Response(JSON.stringify(value), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': `public, s-maxage=${ttl}`
		}
	});
	const p = cache.put(requestFor(key), res).catch((e) => console.warn('[edgeCache] put', key, e));
	if (opts?.waitUntil) opts.waitUntil(p);
	else await p;
}

/** 키 무효화. 쓰기 액션에서 호출. */
export async function invalidateEdgeCache(
	key: string,
	opts?: { waitUntil?: WaitUntil }
): Promise<void> {
	const cache = edgeCache();
	if (!cache) return;
	const p = cache.delete(requestFor(key)).catch((e) => console.warn('[edgeCache] delete', key, e));
	if (opts?.waitUntil) opts.waitUntil(p);
	else await p;
}
