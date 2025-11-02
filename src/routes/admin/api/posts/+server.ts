import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { saveBlogPost, type BlogPost } from '$lib/blog';

export const POST: RequestHandler = async ({ request, cookies }) => {
	// 인증 확인 (쿠키 확인)
	const session = cookies.get('admin_session');
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	
	try {
		const post: BlogPost = await request.json();
		
		// 유효성 검사
		if (!post.tag || !post.title || !post.body) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}
		
		await saveBlogPost(post);
		
		return json({ success: true });
	} catch (error) {
		console.error('Error saving post:', error);
		return json({ error: 'Failed to save post' }, { status: 500 });
	}
};

