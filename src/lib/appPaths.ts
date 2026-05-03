import { base, resolve } from '$app/paths';

/** FS/목록용 블로그 세그먼트(예: `Dev/Unity/t5`) → 절대 경로 */
export function hrefBlogPath(fsPath: string): string {
	const p = fsPath.replace(/^\/+/, '').replace(/\/$/, '');
	if (!p) return resolve('/blog');
	return resolve('/blog/[...path]', { path: p });
}

/** breadcrumb 등 전체 pathname (`/blog`, `/blog/Dev/…`) */
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

/** admin 편집 URL — slug는 `Dev/AI/1` 형태 */
export function hrefAdminPostEdit(slug: string): string {
	return resolve('/admin/posts/[...slug]/edit', { slug });
}
