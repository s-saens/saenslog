import { base, resolve } from '$app/paths';

/** 글 id → `/blog/123` */
export function hrefBlogPost(postId: number | string): string {
	const id = String(postId).replace(/^\/+/, '');
	return resolve('/blog/[...path]', { path: id });
}

/** 폴더 id → `/blog/f/123` */
export function hrefBlogFolder(folderId: number | string): string {
	const id = String(folderId).replace(/^\/+/, '');
	return resolve('/blog/[...path]', { path: `f/${id}` });
}

/**
 * 목록 카드용 — `path`는 글 id 문자열(`"42"`) 또는 폴더 경로(`"f/5"`).
 */
export function hrefBlogPath(pathSegment: string): string {
	const p = pathSegment.replace(/^\/+/, '').replace(/\/$/, '');
	if (!p) return resolve('/blog');
	return resolve('/blog/[...path]', { path: p });
}

/** breadcrumb 등 전체 pathname (`/blog`, `/blog/f/3`, `/blog/9`) */
export function hrefBlogPathname(pathname: string): string {
	if (pathname === '/blog' || pathname === '') return resolve('/blog');
	const rest = pathname.replace(/^\/blog\/?/, '');
	return resolve('/blog/[...path]', { path: rest });
}

/** `/projects`, `/projects/MyTitle` */
export function hrefProjectsPathname(pathname: string): string {
	if (pathname === '/projects' || pathname === '') return resolve('/projects');
	const title = pathname.replace(/^\/projects\/?/, '');
	return resolve('/projects/[title]', { title });
}

/** `resolve` 타입에 없는 pathname에 `base`만 적용 */
export function pathWithBase(pathname: string): string {
	if (!pathname.startsWith('/')) return pathname;
	return `${base}${pathname}`;
}

/** 관리자 편집 — `/admin/posts/123/edit` */
export function hrefAdminPostEdit(postId: number | string): string {
	return resolve('/admin/posts/[id]/edit', { id: String(postId) });
}
