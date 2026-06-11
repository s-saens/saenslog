import { dev } from '$app/environment';
import { getRequestEvent } from '$app/server';
import type { R2Bucket } from '@cloudflare/workers-types';

/**
 * 블로그 미디어(blog/…)·음악(musics/…) 저장소.
 * 프로덕션(Cloudflare Workers)은 R2 버킷, 로컬 dev는 static/ 디렉터리를 사용한다.
 * 키는 선행 슬래시 없는 공개 경로와 동일 (예: `blog/39/0001.png`).
 */

export const MEDIA_MIME_TYPES: Record<string, string> = {
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

export function mimeForKey(key: string): string | null {
	const m = key.match(/(\.[a-z0-9]+)$/i);
	return m ? (MEDIA_MIME_TYPES[m[1].toLowerCase()] ?? null) : null;
}

export interface MediaObjectInfo {
	/** 선행 슬래시 없는 키 (공개 URL은 `/${key}`) */
	key: string;
	size: number;
	uploadedAtMs: number;
}

export interface MediaContent {
	body: BodyInit;
	contentType: string | null;
	size: number;
}

export interface MediaStore {
	list(prefix: string): Promise<MediaObjectInfo[]>;
	get(key: string): Promise<MediaContent | null>;
	put(key: string, data: ArrayBuffer, contentType: string): Promise<void>;
	deletePrefix(prefix: string): Promise<void>;
}

function r2Bucket(): R2Bucket {
	const bucket = getRequestEvent().platform?.env?.MEDIA;
	if (!bucket) throw new Error('R2 MEDIA 바인딩이 없습니다. wrangler.jsonc를 확인하세요.');
	return bucket;
}

const r2Store: MediaStore = {
	async list(prefix) {
		const bucket = r2Bucket();
		const out: MediaObjectInfo[] = [];
		let cursor: string | undefined;
		do {
			const res = await bucket.list({ prefix, cursor, limit: 1000 });
			for (const obj of res.objects) {
				out.push({ key: obj.key, size: obj.size, uploadedAtMs: obj.uploaded.getTime() });
			}
			cursor = res.truncated ? res.cursor : undefined;
		} while (cursor);
		return out;
	},

	async get(key) {
		const obj = await r2Bucket().get(key);
		if (!obj) return null;
		return {
			body: obj.body as unknown as BodyInit,
			contentType: obj.httpMetadata?.contentType ?? mimeForKey(key),
			size: obj.size
		};
	},

	async put(key, data, contentType) {
		await r2Bucket().put(key, data, { httpMetadata: { contentType } });
	},

	async deletePrefix(prefix) {
		const bucket = r2Bucket();
		let cursor: string | undefined;
		do {
			const res = await bucket.list({ prefix, cursor, limit: 1000 });
			const keys = res.objects.map((o) => o.key);
			if (keys.length > 0) await bucket.delete(keys);
			cursor = res.truncated ? res.cursor : undefined;
		} while (cursor);
	}
};

/** dev 전용: static/ 디렉터리 기반 (프로덕션 번들에서는 트리셰이킹으로 제거됨) */
const fsStore: MediaStore = {
	async list(prefix) {
		const { readdir, stat } = await import('node:fs/promises');
		const path = await import('node:path');
		const root = path.join(process.cwd(), 'static');

		const out: MediaObjectInfo[] = [];
		async function walk(relDir: string): Promise<void> {
			let entries;
			try {
				entries = await readdir(path.join(root, relDir), { withFileTypes: true });
			} catch {
				return;
			}
			for (const ent of entries) {
				const rel = relDir ? `${relDir}/${ent.name}` : ent.name;
				if (ent.isDirectory()) {
					await walk(rel);
				} else if (rel.startsWith(prefix) && mimeForKey(rel)) {
					const st = await stat(path.join(root, rel));
					out.push({ key: rel, size: st.size, uploadedAtMs: st.mtimeMs });
				}
			}
		}
		// prefix의 디렉터리 부분부터 탐색해 전체 스캔을 피한다
		const startDir = prefix.includes('/') ? prefix.slice(0, prefix.lastIndexOf('/')) : '';
		await walk(startDir);
		return out;
	},

	async get(key) {
		const { readFile } = await import('node:fs/promises');
		const path = await import('node:path');
		try {
			const buf = await readFile(path.join(process.cwd(), 'static', ...key.split('/')));
			return { body: new Uint8Array(buf), contentType: mimeForKey(key), size: buf.length };
		} catch {
			return null;
		}
	},

	async put(key, data, _contentType) {
		const { mkdir, writeFile } = await import('node:fs/promises');
		const path = await import('node:path');
		const filePath = path.join(process.cwd(), 'static', ...key.split('/'));
		await mkdir(path.dirname(filePath), { recursive: true });
		await writeFile(filePath, new Uint8Array(data));
	},

	async deletePrefix(prefix) {
		const { rm } = await import('node:fs/promises');
		const path = await import('node:path');
		const dir = path.join(process.cwd(), 'static', ...prefix.replace(/\/$/, '').split('/'));
		await rm(dir, { recursive: true, force: true });
	}
};

export function mediaStore(): MediaStore {
	return dev ? fsStore : r2Store;
}
