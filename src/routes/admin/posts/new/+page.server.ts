import { fail, redirect } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { renderMarkdownToHtml } from '$lib/server/markdown';
import type { Actions, PageServerLoad } from './$types';

const BLOG_DIR = path.join(process.cwd(), 'static', 'blog');

export const load: PageServerLoad = async ({ url }) => {
	const raw = (url.searchParams.get('parent') ?? '').trim().replace(/^\/+|\/+$/g, '');
	return { parentPrefix: raw };
};

export const actions: Actions = {
	autosave: async ({ request, locals }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		if (!user) return fail(401, { message: '로그인이 필요합니다.' });

		const form = await request.formData();
		const slugRaw = String(form.get('slug') ?? '').trim();
		const title = String(form.get('title') ?? '').trim();
		const content_md = String(form.get('content_md') ?? '');

		// 초안 저장 시 파일명을 temp-{timestamp}으로 생성
		const timestamp = Date.now();
		const draftSlug = slugRaw ? slugRaw.replace(/^\/+|\/+$/g, '') : `temp-${timestamp}`;
		const postDir = path.join(BLOG_DIR, draftSlug);
		const postPath = path.join(postDir, 'post.md');

		// 디렉토리 생성
		fs.mkdirSync(postDir, { recursive: true });

		// Frontmatter - publish는 false로 고정
		const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
		const frontmatter = {
			title: title || '(제목 없음)',
			created: now,
			updated: now,
			publish: false
		};

		const fileContent = matter.stringify(content_md, frontmatter);
		fs.writeFileSync(postPath, fileContent, 'utf8');

		return { success: true };
	},
	save: async ({ request, locals }) => {
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		if (!user) return fail(401, { message: '로그인이 필요합니다.' });

		const form = await request.formData();
		const slugRaw = String(form.get('slug') ?? '').trim();
		if (!slugRaw) return fail(400, { message: '슬러그를 입력하세요.' });

		// 슬러그 정규화 (앞뒤 슬래시 제거)
		const slug = slugRaw.replace(/^\/+|\/+$/g, '');
		if (!slug) return fail(400, { message: '슬러그가 비어 있습니다.' });
		if (slug.includes('..')) return fail(400, { message: '슬러그에 .. 를 쓸 수 없습니다.' });

		const title = String(form.get('title') ?? '').trim();
		if (!title) return fail(400, { message: '제목을 입력하세요.' });

		const content_md = String(form.get('content_md') ?? '');
		if (!content_md.trim()) return fail(400, { message: '본문을 입력하세요.' });

		const published = form.get('published') === 'true';

		// post.md 경로 생성
		const postDir = path.join(BLOG_DIR, slug);
		const postPath = path.join(postDir, 'post.md');

		// 이미 존재하는지 확인
		if (fs.existsSync(postPath)) {
			return fail(400, { message: '이미 존재하는 글입니다.' });
		}

		// 디렉토리 생성
		fs.mkdirSync(postDir, { recursive: true });

		// Frontmatter
		const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
		const frontmatter = {
			title,
			created: now,
			updated: now,
			publish: published
		};

		const fileContent = matter.stringify(content_md, frontmatter);
		fs.writeFileSync(postPath, fileContent, 'utf8');

		throw redirect(303, `/blog/${slug}`);
	}
};
