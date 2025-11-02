import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getBlogPost } from '$lib/blog';
import { marked } from 'marked';

export const load: PageServerLoad = async ({ params }) => {
	const tag = params.tag;
	const number = parseInt(params.number);
	
	if (!tag || isNaN(number)) {
		throw error(404, 'Not found');
	}
	
	const post = await getBlogPost(tag, number);
	
	if (!post || !post.published) {
		throw error(404, 'Not found');
	}
	
	// 마크다운을 HTML로 변환
	const htmlBody = marked(post.body);
	
	return {
		post: {
			...post,
			htmlBody
		}
	};
};

