import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomBytes } from 'crypto';

const UPLOAD_DIR = 'static/images/blog';

export const POST: RequestHandler = async ({ request, cookies }) => {
	// 인증 확인
	const session = cookies.get('admin_session');
	if (!session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	
	try {
		const formData = await request.formData();
		const file = formData.get('image') as File;
		
		if (!file) {
			return json({ error: 'No file provided' }, { status: 400 });
		}
		
		// 디렉토리 생성 (없는 경우)
		await mkdir(UPLOAD_DIR, { recursive: true });
		
		// 파일명 생성
		const ext = file.name.split('.').pop();
		const filename = `${randomBytes(16).toString('hex')}.${ext}`;
		const filepath = join(UPLOAD_DIR, filename);
		
		// 파일 저장
		const buffer = Buffer.from(await file.arrayBuffer());
		await writeFile(filepath, buffer);
		
		// URL 반환
		const url = `/images/blog/${filename}`;
		
		return json({ url });
	} catch (error) {
		console.error('Error uploading image:', error);
		return json({ error: 'Failed to upload image' }, { status: 500 });
	}
};

