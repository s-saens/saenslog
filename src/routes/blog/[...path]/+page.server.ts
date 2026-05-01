import { getAllPosts, getBlogItems, getBlogPost } from '$lib/server/blog';
import type { PageServerLoad } from './$types';

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
