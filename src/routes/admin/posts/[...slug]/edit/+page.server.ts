import { error, fail, redirect } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getBlogPost } from '$lib/server/blog';
import { rewriteBlogAssetPathsInMarkdown } from '$lib/server/blogPostAssets';
import type { Actions, PageServerLoad } from './$types';

const BLOG_DIR = path.join(process.cwd(), 'static', 'blog');

function slugFromParams(slug: string | string[] | undefined): string {
	if (slug === undefined) return '';
	if (Array.isArray(slug)) return slug.join('/');
	return slug;
}

export const load: PageServerLoad = async ({ params }) => {
	const slug = slugFromParams(params.slug);
	if (!slug) error(404, 'Not found');

	const post = getBlogPost(slug);
	if (!post) error(404, '글을 찾을 수 없습니다.');

	return { post: { title: post.title, slug, content_md: post.content, published: post.publish } };
};

export const actions: Actions = {
	autosave: async ({ request, params }) => {
		const slug = slugFromParams(params.slug);
		if (!slug) return fail(400, { message: '슬러그가 없습니다.' });

		const postMdPath = path.join(BLOG_DIR, slug, 'post.md');
		if (!fs.existsSync(postMdPath)) {
			return fail(404, { message: '글을 찾을 수 없습니다.' });
		}

		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const content_md = String(form.get('content_md') ?? '');
		const published = form.get('published') === 'true';

		// 파일 읽기
		const fileContents = fs.readFileSync(postMdPath, 'utf8');
		const { data } = matter(fileContents);

		// Frontmatter 업데이트 - updated는 현재 시간으로
		const updated = new Date().toISOString().slice(0, 16).replace('T', ' ');
		const newFrontmatter = {
			title: title || data.title || '(제목 없음)',
			created: data.created || updated,
			updated,
			publish: published,
			...(data.category ? { category: data.category } : {}),
			...(data.tags ? { tags: data.tags } : {})
		};

		const newFileContent = matter.stringify(content_md, newFrontmatter);
		fs.writeFileSync(postMdPath, newFileContent, 'utf8');

		return { success: true };
	},
	save: async ({ request, params }) => {
		const oldSlug = slugFromParams(params.slug);
		if (!oldSlug) return fail(400, { message: '슬러그가 없습니다.' });

		const postMdPath = path.join(BLOG_DIR, oldSlug, 'post.md');
		if (!fs.existsSync(postMdPath)) {
			return fail(404, { message: '글을 찾을 수 없습니다.' });
		}

		const form = await request.formData();
		const newSlugRaw = String(form.get('slug') ?? '').trim();
		if (!newSlugRaw) return fail(400, { message: '슬러그를 입력하세요.' });

		const title = String(form.get('title') ?? '').trim();
		if (!title) return fail(400, { message: '제목을 입력하세요.' });

		const content_md = String(form.get('content_md') ?? '');
		if (!content_md.trim()) return fail(400, { message: '본문을 입력하세요.' });

		const published = form.get('published') === 'true';

		const newSlug = newSlugRaw.replace(/^\/+|\/+$/g, '');
		if (!newSlug) return fail(400, { message: '슬러그가 비어 있습니다.' });
		if (newSlug.includes('..')) return fail(400, { message: '슬러그에 .. 를 쓸 수 없습니다.' });

		const fileContents = fs.readFileSync(postMdPath, 'utf8');
		const { data } = matter(fileContents);

		const updated = new Date().toISOString().slice(0, 16).replace('T', ' ');
		const newFrontmatter = {
			title,
			created: data.created || updated,
			updated,
			publish: published,
			...(data.category ? { category: data.category } : {}),
			...(data.tags ? { tags: data.tags } : {})
		};

		const newFileContent = matter.stringify(content_md, newFrontmatter);

		const oldPostDir = path.join(BLOG_DIR, oldSlug);
		const newPostDir = path.join(BLOG_DIR, newSlug);

		if (oldSlug !== newSlug) {
			if (fs.existsSync(newPostDir)) {
				return fail(400, { message: '이미 존재하는 슬러그입니다.' });
			}

			fs.mkdirSync(path.dirname(newPostDir), { recursive: true });
			fs.renameSync(oldPostDir, newPostDir);

			const rewrittenContent = rewriteBlogAssetPathsInMarkdown(content_md, oldSlug, newSlug);
			fs.writeFileSync(path.join(newPostDir, 'post.md'), matter.stringify(rewrittenContent, newFrontmatter), 'utf8');
		} else {
			fs.writeFileSync(postMdPath, newFileContent, 'utf8');
		}

		return { success: true };
	},
	delete: async ({ params }) => {
		const slug = slugFromParams(params.slug);
		if (!slug) return fail(400, { message: '슬러그가 없습니다.' });

		const postDir = path.join(BLOG_DIR, slug);
		if (!fs.existsSync(postDir)) {
			return fail(404, { message: '삭제할 글을 찾을 수 없습니다.' });
		}

		try {
			fs.rmSync(postDir, { recursive: true, force: true });
		} catch (err) {
			console.error('Failed to delete post:', err);
			return fail(500, { message: '글 삭제에 실패했습니다.' });
		}

		throw redirect(303, '/admin/posts');
	}
};
