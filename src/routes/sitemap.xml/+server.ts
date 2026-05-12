import { env as publicEnv } from '$env/dynamic/public';
import { BLOG_ROOT_FOLDER_ID, fetchAllFolders } from '$lib/server/folders';
import { listPublishedPosts } from '$lib/server/posts';
import { createSupabaseServer } from '$lib/server/supabase';
import type { RequestHandler } from './$types';

const projectModules = import.meta.glob('/src/lib/projects/*/info.json');

function xmlEscape(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export const GET: RequestHandler = async (event) => {
	const configured = (publicEnv.PUBLIC_SITE_URL ?? '').trim().replace(/\/$/, '');
	const base = configured || event.url.origin;

	const supabase = createSupabaseServer(event);
	const [posts, folders] = await Promise.all([
		listPublishedPosts(supabase),
		fetchAllFolders(supabase)
	]);

	const chunks: string[] = [];
	const pushUrl = (loc: string, lastmod?: string) => {
		const lm =
			lastmod != null && lastmod !== ''
				? `\n    <lastmod>${xmlEscape(lastmod.slice(0, 10))}</lastmod>`
				: '';
		chunks.push(`  <url>\n    <loc>${xmlEscape(loc)}</loc>${lm}\n  </url>`);
	};

	pushUrl(`${base}/`);
	pushUrl(`${base}/blog`);

	for (const p of posts) {
		pushUrl(`${base}/blog/${p.id}`, p.published_at ?? p.updated_at);
	}

	for (const f of folders) {
		if (f.id !== BLOG_ROOT_FOLDER_ID) {
			pushUrl(`${base}/blog/f/${f.id}`);
		}
	}

	pushUrl(`${base}/projects`);

	for (const filePath in projectModules) {
		const mod = (await projectModules[filePath]()) as { default: { title: string } };
		const title = mod.default.title;
		pushUrl(`${base}/projects/${encodeURIComponent(title)}`);
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${chunks.join('\n')}\n</urlset>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
