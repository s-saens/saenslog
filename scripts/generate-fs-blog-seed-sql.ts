/**
 * src/lib/blog/*.md → public.posts 시드용 SQL 생성
 * 실행: npx tsx scripts/generate-fs-blog-seed-sql.ts > /tmp/seed.sql
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import matter from 'gray-matter';
import { renderMarkdownToHtml } from '../src/lib/markdownCompile.ts';

const BLOG_DIR = path.join(process.cwd(), 'src/lib/blog');
export const AUTHOR_ID = 'd5ba8b83-302f-40ba-99b4-423875cb0de4';

function countWords(md: string): number {
	const t = md.trim();
	if (!t) return 0;
	return t.split(/\s+/).filter(Boolean).length;
}

function parseDate(data: Record<string, unknown>): string {
	if (!data.date) return new Date().toISOString();
	if (data.date instanceof Date) return data.date.toISOString();
	const d = new Date(String(data.date));
	if (Number.isNaN(d.getTime())) return new Date().toISOString();
	return d.toISOString();
}

export type SeedRow = {
	slug: string;
	title: string;
	content_md: string;
	content_html: string;
	word_count: number;
	published_at: string;
};

export function collectMarkdownFiles(): SeedRow[] {
	const rows: SeedRow[] = [];

	function walk(absDir: string, rel: string) {
		for (const item of fs.readdirSync(absDir, { withFileTypes: true })) {
			const abs = path.join(absDir, item.name);
			if (item.isDirectory()) {
				walk(abs, rel ? `${rel}/${item.name}` : item.name);
				continue;
			}
			if (!item.name.endsWith('.md')) continue;

			const slug = rel
				? `${rel}/${path.basename(item.name, '.md')}`
				: path.basename(item.name, '.md');
			const raw = fs.readFileSync(abs, 'utf8');
			const { data, content } = matter(raw);
			const dm = data as Record<string, unknown>;
			const title = String(dm.title ?? 'Untitled').trim() || 'Untitled';
			const published_at = parseDate(dm);
			const content_md = content;
			const content_html = renderMarkdownToHtml(content_md);
			const word_count = countWords(content_md);

			rows.push({
				slug,
				title,
				content_md,
				content_html,
				word_count,
				published_at
			});
		}
	}

	if (!fs.existsSync(BLOG_DIR)) {
		throw new Error(`Missing ${BLOG_DIR}`);
	}
	walk(BLOG_DIR, '');
	rows.sort((a, b) => a.slug.localeCompare(b.slug));
	return rows;
}

type PayloadRow = {
	slug: string;
	title: string;
	content_md: string;
	content_html: string;
	word_count: number;
	published_at: string;
};

function buildPayloadRow(r: SeedRow): PayloadRow {
	return {
		slug: r.slug,
		title: r.title,
		content_md: r.content_md,
		content_html: r.content_html,
		word_count: r.word_count,
		published_at: r.published_at
	};
}

function sqlForPayload(payload: PayloadRow[], delim: string) {
	const json = JSON.stringify(payload);
	return `INSERT INTO public.posts (
  slug, title, content_md, content_html, word_count,
  author_id, published, published_at, created_at, updated_at
)
SELECT
  r.slug::text,
  r.title::text,
  r.content_md::text,
  r.content_html::text,
  r.word_count::int,
  '${AUTHOR_ID}'::uuid,
  true,
  (r.published_at::text)::timestamptz,
  (r.published_at::text)::timestamptz,
  (r.published_at::text)::timestamptz
FROM jsonb_to_recordset($${delim}$${json}$${delim}$::jsonb)
  AS r(
    slug text,
    title text,
    content_md text,
    content_html text,
    word_count int,
    published_at text
  );`;
}

function main() {
	const rows = collectMarkdownFiles();
	const chunkArg = process.argv.find((a) => a.startsWith('--chunk='));
	const sizeArg = process.argv.find((a) => a.startsWith('--chunk-size='));
	const chunkSize = sizeArg ? Math.max(1, parseInt(sizeArg.split('=')[1] ?? '5', 10)) : rows.length;

	if (chunkArg) {
		const idx = parseInt(chunkArg.split('=')[1] ?? '0', 10);
		const start = idx * chunkSize;
		const slice = rows.slice(start, start + chunkSize);
		if (slice.length === 0) {
			process.stderr.write(`-- chunk ${idx}: empty\n`);
			return;
		}
		const delim = `seed_blog_json_${idx}_${Date.now()}`;
		const payload = slice.map(buildPayloadRow);
		console.log(`-- fs blog seed chunk ${idx} (${slice.length} posts), author ${AUTHOR_ID}`);
		console.log(sqlForPayload(payload, delim));
		return;
	}

	const payload = rows.map(buildPayloadRow);
	let delim = 'seed_blog_json';
	while (JSON.stringify(payload).includes(`$${delim}$`)) {
		delim += '_x';
	}

	console.log(`-- fs blog seed (${rows.length} posts), author ${AUTHOR_ID}`);
	console.log(sqlForPayload(payload, delim));
}

const isMain =
	typeof process !== 'undefined' &&
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
	main();
}
