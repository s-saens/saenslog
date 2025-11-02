import type { RequestHandler } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

// 환경 변수에서 비밀번호 가져오기 (기본값: 'admin')
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { password } = await request.json();
	
	if (password === ADMIN_PASSWORD) {
		// 간단한 토큰 생성 (실제 프로덕션에서는 더 안전한 방법 사용)
		const token = Buffer.from(`admin-${Date.now()}`).toString('base64');
		
		// 쿠키 설정
		cookies.set('admin_session', token, {
			path: '/',
			httpOnly: true,
			sameSite: 'strict',
			secure: process.env.NODE_ENV === 'production',
			maxAge: 60 * 60 * 24 * 7 // 7일
		});
		
		return json({ token, success: true });
	}
	
	return json({ success: false }, { status: 401 });
};

