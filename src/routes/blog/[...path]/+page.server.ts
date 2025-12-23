import { getAllPosts, getBlogItems, getBlogPost } from '$lib/server/blog';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const path = params.path || '';
	const segments = path.split('/').filter(Boolean);

	// Breadcrumb 생성 (링크 정보 포함)
	const breadcrumb = [
		{ label: 'Blog', path: '/blog' },
		...segments.map((segment, index) => {
			const segmentPath = segments.slice(0, index + 1).join('/');
			return {
				label: segment,
				path: `/blog/${segmentPath}`
			};
		})
	];

	// 마지막 세그먼트가 숫자인지 확인 (글 인덱스)
	const lastSegment = segments[segments.length - 1];
	const isPost = /^\d+$/.test(lastSegment);

	if (isPost) {
		// 글 페이지
		const post = getBlogPost(path);

		if (!post) {
			throw error(404, 'Post not found');
		}

		// 포스트에서는 breadcrumb에 숫자(포스트 인덱스) 제외
		const postBreadcrumb = [
			{ label: 'Blog', path: '/blog' },
			...segments.slice(0, -1).map((segment, index) => {
				const segmentPath = segments.slice(0, index + 1).join('/');
				return {
					label: segment,
					path: `/blog/${segmentPath}`
				};
			})
		];

		return {
			path,
			segments,
			breadcrumb: postBreadcrumb,
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
		console.log(path);
		const allPosts = getAllPosts(path);

		return {
			path,
			segments,
			breadcrumb,
			isPost: false,
			folders: folders.map((folder) => ({
				name: folder.name,
				path: folder.path,
				folderCount: folder.folderCount,
				postCount: folder.postCount,
				totalFolderCount: folder.totalFolderCount,
				totalPostCount: folder.totalPostCount,
				date: folder.date
			})),
			posts: posts.map((post) => ({
				title: post.title,
				path: post.path,
				category: post.category,
				date: post.date,
				wordCount: post.wordCount
			})),
			allPosts: allPosts.map((post) => ({
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
