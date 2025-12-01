import { getBlogItems, getBlogPost } from '$lib/server/blog';
import { error } from '@sveltejs/kit';
import type { PageServerLoad, EntryGenerator } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const path = params.path || '';
	const segments = path.split('/').filter(Boolean);

	// Breadcrumb 생성
	const breadcrumb = ['Blog', ...segments];

	// 마지막 세그먼트가 숫자인지 확인 (글 인덱스)
	const lastSegment = segments[segments.length - 1];
	const isPost = /^\d+$/.test(lastSegment);

	if (isPost) {
		// 글 페이지
		const post = getBlogPost(path);

		if (!post) {
			throw error(404, 'Post not found');
		}

		return {
			path,
			segments,
			breadcrumb,
			isPost: true,
			title: post.title,
			date: post.date,
			category: post.category,
			content: post.content,
			wordCount: post.wordCount,
			tags: post.tags
		};
	} else {
		// 카테고리 페이지
		const { folders, posts } = getBlogItems(path);

		return {
			path,
			segments,
			breadcrumb,
			isPost: false,
			folders: folders.map((folder) => ({
				name: folder.name,
				path: folder.path,
				count: folder.count,
				date: folder.date
			})),
			posts: posts.map((post) => ({
				title: post.title,
				path: post.path,
				category: post.category,
				date: post.date,
				wordCount: post.wordCount
			}))
		};
	}
};

// 프리렌더할 경로들을 명시적으로 지정
export const entries: EntryGenerator = () => {
	const paths: Array<{ path: string }> = [];

	// 재귀적으로 모든 경로 수집
	function collectPaths(currentPath: string = '') {
		const { folders, posts } = getBlogItems(currentPath);

		// 현재 경로 추가 (빈 문자열이 아닌 경우)
		if (currentPath) {
			paths.push({ path: currentPath });
		}

		// 하위 폴더 탐색
		for (const folder of folders) {
			collectPaths(folder.path);
		}

		// 포스트 경로 추가
		for (const post of posts) {
			paths.push({ path: post.path });
		}
	}

	collectPaths();

	return paths;
};
