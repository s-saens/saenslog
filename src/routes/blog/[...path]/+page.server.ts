import { getAllPosts, getBlogItems, getBlogPost } from '$lib/server/blog';
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

	// .md 파일이 실제로 존재하면 글 페이지로 처리
	const post = getBlogPost(path);
	const isPost = post !== null;

	if (isPost) {
		// 포스트에서는 breadcrumb에 마지막 파일명 세그먼트 제외
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
			tags: post.tags,
			tistory: post.tistory
		};
	} else {
		// 카테고리 페이지
		const { folders, posts } = getBlogItems(path);
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
				wordCount: post.wordCount,
				tistory: post.tistory
			})),
			allPosts: allPosts.map((post) => ({
				title: post.title,
				path: post.path,
				category: post.category,
				date: post.date,
				wordCount: post.wordCount,
				tistory: post.tistory
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
