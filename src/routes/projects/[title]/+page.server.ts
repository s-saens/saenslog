import fs from 'fs';
import path from 'path';
import { error } from '@sveltejs/kit';
import matter from 'gray-matter';
import { getBlogPost, renderMarkdownContent } from '$lib/server/blog';
import type { PageServerLoad } from './$types';

export const prerender = true;

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

export const load: PageServerLoad = async ({ params }) => {
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

	const relatedRaw = project['related-posts'] ?? [];
	const relatedPosts = relatedRaw
		.map(normalizeBlogPath)
		.map((p) => getBlogPost(p))
		.filter((post): post is NonNullable<typeof post> => post !== null)
		.map((post) => ({
			title: post.title,
			path: post.path,
			category: post.category,
			date: post.date,
			wordCount: post.wordCount,
			...(post.tistory ? { tistory: post.tistory } : {})
		}));

	const descriptionSlides: { html: string }[] = [];
	const descDir = path.join(PROJECTS_ROOT, project.id, 'descriptions');
	if (fs.existsSync(descDir)) {
		const files = fs.readdirSync(descDir).filter((f) => f.endsWith('.md'));
		files.sort((a, b) => {
			const na = parseInt(path.basename(a, '.md'), 10);
			const nb = parseInt(path.basename(b, '.md'), 10);
			if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
			return a.localeCompare(b);
		});

		for (const file of files) {
			const raw = fs.readFileSync(path.join(descDir, file), 'utf8');
			const { content } = matter(raw);
			descriptionSlides.push({
				html: renderMarkdownContent(content.trim() || raw)
			});
		}
	}

	return {
		project,
		relatedPosts,
		descriptionSlides
	};
};
