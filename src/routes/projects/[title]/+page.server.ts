import { readdir, readFile } from 'node:fs/promises';
import path from 'path';
import { error } from '@sveltejs/kit';
import matter from 'gray-matter';
import { renderMarkdownContent } from '$lib/server/blog';
import { listPostsByIds } from '$lib/server/posts';
import { SEO_DEFAULT_DESCRIPTION } from '$lib/seo';
import type { PageServerLoad } from './$types';

export const prerender = 'auto';

interface Link {
	name: string;
	icon: string;
	url: string;
}

interface Prize {
	name: string;
	date: string;
	award: string;
}

interface ProjectInfo {
	title: string;
	tags: string[];
	startDate: string;
	endDate: string;
	links?: Link[];
	'related-posts'?: string[];
	prizes?: Prize[];
}

interface Project extends ProjectInfo {
	id: string;
	logoPath: string;
	screenshotPaths: string[];
}

const PROJECTS_ROOT = path.join(process.cwd(), 'src/lib/projects');

function normalizeBlogPath(raw: string): string {
	let p = raw.trim();
	if (p.startsWith('blog/')) p = p.slice(5);
	return p.replace(/^\//, '');
}

function relatedPostIdFromEntry(raw: string): number | null {
	const p = normalizeBlogPath(raw);
	const n = Number(p);
	if (Number.isFinite(n) && n > 0) return Math.floor(n);
	return null;
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const title = params.title;

	const projectModules = import.meta.glob('/src/lib/projects/*/info.json');
	const logoModules = import.meta.glob('/src/lib/projects/*/logo.png', {
		eager: true,
		query: '?url',
		import: 'default'
	});
	const screenshotModules = import.meta.glob('/src/lib/projects/*/screenshots/*.png', {
		eager: true,
		query: '?url',
		import: 'default'
	});

	let project: Project | null = null;

	for (const filePath in projectModules) {
		const info = (await projectModules[filePath]()) as { default: ProjectInfo };

		if (info.default.title === title) {
			const match = filePath.match(/\/(\d{3}-[^/]+)\/info\.json$/);

			if (match) {
				const projectId = match[1];
				const logoPathKey = `/src/lib/projects/${projectId}/logo.png`;
				const logoUrl = logoModules[logoPathKey] as string;

				const screenshotPaths: string[] = [];
				for (const screenshotPath in screenshotModules) {
					if (screenshotPath.includes(projectId)) {
						screenshotPaths.push(screenshotModules[screenshotPath] as string);
					}
				}
				screenshotPaths.sort();

				project = {
					id: projectId,
					...info.default,
					logoPath: logoUrl,
					screenshotPaths
				};
				break;
			}
		}
	}

	if (!project) {
		error(404, `프로젝트를 찾을 수 없습니다: ${title}`);
	}

	const relatedIds = (project['related-posts'] ?? [])
		.map((entry) => relatedPostIdFromEntry(String(entry)))
		.filter((id): id is number => id != null);

	const descDir = path.join(PROJECTS_ROOT, project.id, 'descriptions');

	// 관련 글은 한 번의 배치 쿼리로, 설명 파일은 비동기 병렬로 읽음
	const [relatedRows, slideRaws] = await Promise.all([
		relatedIds.length > 0
			? listPostsByIds(locals.supabase, relatedIds, { onlyPublished: true })
			: Promise.resolve([]),
		(async () => {
			let files: string[];
			try {
				files = (await readdir(descDir)).filter((f) => f.endsWith('.md'));
			} catch {
				return [];
			}
			files.sort((a, b) => {
				const na = parseInt(path.basename(a, '.md'), 10);
				const nb = parseInt(path.basename(b, '.md'), 10);
				if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
				return a.localeCompare(b);
			});
			return Promise.all(files.map((file) => readFile(path.join(descDir, file), 'utf8')));
		})()
	]);

	const relatedById = new Map(relatedRows.map((r) => [r.id, r]));
	const relatedPosts = relatedIds
		.map((id) => relatedById.get(id))
		.filter((row): row is NonNullable<typeof row> => row != null)
		.map((row) => ({
			title: row.title,
			path: String(row.id),
			category: '',
			date: row.published_at ?? row.updated_at,
			wordCount: row.word_count,
			viewCount: Number(row.view_count ?? 0)
		}));

	const descriptionSlides = slideRaws.map((raw) => {
		const { content } = matter(raw);
		return { html: renderMarkdownContent(content.trim() || raw) };
	});

	return {
		project,
		relatedPosts,
		descriptionSlides,
		seo: {
			title: project.title,
			description:
				project.tags.length > 0
					? `${project.tags.join(', ')} — 프로젝트 소개`
					: SEO_DEFAULT_DESCRIPTION,
			canonicalPath: `/projects/${title}`,
			ogImage: project.logoPath
		}
	};
};
