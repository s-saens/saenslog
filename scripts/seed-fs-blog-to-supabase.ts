/**
 * src/lib/blog → public.posts 일괄 삽입 (service_role)
 * .env 에 PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY 필요
 * 실행: npx tsx scripts/seed-fs-blog-to-supabase.ts
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { AUTHOR_ID, collectMarkdownFiles } from './generate-fs-blog-seed-sql.ts';

function loadDotEnv() {
	const p = join(process.cwd(), '.env');
	if (!existsSync(p)) return;
	for (const line of readFileSync(p, 'utf8').split('\n')) {
		const t = line.trim();
		if (!t || t.startsWith('#')) continue;
		const i = t.indexOf('=');
		if (i === -1) continue;
		const key = t.slice(0, i).trim();
		let val = t.slice(i + 1).trim();
		if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
			val = val.slice(1, -1);
		}
		if (process.env[key] === undefined) process.env[key] = val;
	}
}

async function main() {
	loadDotEnv();
	const url = process.env.PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SECRET_KEY;
	if (!url || !key) {
		console.error('PUBLIC_SUPABASE_URL 및 SUPABASE_SECRET_KEY가 .env 에 필요합니다.');
		process.exit(1);
	}

	const supabase = createClient(url, key, {
		auth: { persistSession: false, autoRefreshToken: false }
	});

	const rows = collectMarkdownFiles();
	let ok = 0;
	const errors: string[] = [];

	for (const r of rows) {
		const ts = r.published_at;
		const { error } = await supabase.from('posts').insert({
			slug: r.slug,
			title: r.title,
			content_md: r.content_md,
			content_html: r.content_html,
			word_count: r.word_count,
			author_id: AUTHOR_ID,
			published: true,
			published_at: ts,
			created_at: ts,
			updated_at: ts
		});
		if (error) {
			errors.push(`${r.slug}: ${error.message}`);
			console.error(error.message, r.slug);
		} else {
			ok++;
		}
	}

	console.log(`완료: 삽입 ${ok}/${rows.length}`);
	if (errors.length) {
		console.error('실패:', errors.length);
		process.exit(1);
	}
}

void main();
