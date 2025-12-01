import { getBlogItems, getAllPosts } from '$lib/server/blog';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const { folders, posts } = getBlogItems('');
	const allPosts = getAllPosts(); // 모든 글 가져오기 (제한 없음)

	return {
		folders: folders.map((folder) => ({
			name: folder.name,
			path: folder.path,
			count: folder.count,
			date: folder.date
		})),
		allPosts: allPosts.map((post) => ({
			title: post.title,
			path: post.path,
			category: post.category,
			date: post.date,
			wordCount: post.wordCount
		}))
	};
};

