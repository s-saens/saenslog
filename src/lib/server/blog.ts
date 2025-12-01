import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'src/lib/blog');

export interface BlogPost {
	title: string;
	date: string;
	category: string;
	tags: string[];
	content: string;
	wordCount: number;
	path: string;
}

export interface FolderInfo {
	name: string;
	path: string;
	count: number;
	date: string;
}

// 특정 경로의 파일 시스템 읽기
export function getBlogItems(relativePath: string = '') {
	const fullPath = path.join(BLOG_DIR, relativePath);

	// 경로가 존재하는지 확인
	if (!fs.existsSync(fullPath)) {
		return { folders: [], posts: [] };
	}

	const items = fs.readdirSync(fullPath, { withFileTypes: true });
	const folders: FolderInfo[] = [];
	const posts: BlogPost[] = [];

	for (const item of items) {
		if (item.isDirectory()) {
			// 폴더인 경우
			const folderPath = path.join(fullPath, item.name);
			const count = countPostsInFolder(folderPath);
			const lastModified = getLastModifiedDate(folderPath);

			folders.push({
				name: item.name,
				path: relativePath ? `${relativePath}/${item.name}` : item.name,
				count,
				date: lastModified
			});
		} else if (item.name.endsWith('.md')) {
			// 마크다운 파일인 경우
			const filePath = path.join(fullPath, item.name);
			const post = parseMarkdownFile(filePath, relativePath, item.name);
			if (post) {
				posts.push(post);
			}
		}
	}

	// 정렬: 폴더는 이름순, 포스트는 번호순
	folders.sort((a, b) => a.name.localeCompare(b.name));
	posts.sort((a, b) => {
		const aNum = parseInt(path.basename(a.path, '.md'));
		const bNum = parseInt(path.basename(b.path, '.md'));
		return aNum - bNum;
	});

	return { folders, posts };
}

// 폴더 내 포스트 개수 세기 (재귀)
function countPostsInFolder(folderPath: string): number {
	let count = 0;

	if (!fs.existsSync(folderPath)) {
		return 0;
	}

	const items = fs.readdirSync(folderPath, { withFileTypes: true });

	for (const item of items) {
		if (item.isDirectory()) {
			count += countPostsInFolder(path.join(folderPath, item.name));
		} else if (item.name.endsWith('.md')) {
			count++;
		}
	}

	return count;
}

// 폴더의 최근 수정 날짜 가져오기
function getLastModifiedDate(folderPath: string): string {
	if (!fs.existsSync(folderPath)) {
		return new Date().toISOString().split('T')[0];
	}

	const stats = fs.statSync(folderPath);
	return stats.mtime.toISOString().split('T')[0];
}

// 마크다운 파일 파싱
function parseMarkdownFile(
	filePath: string,
	relativePath: string,
	fileName: string
): BlogPost | null {
	try {
		const fileContents = fs.readFileSync(filePath, 'utf8');
		const { data, content } = matter(fileContents);

		const wordCount = content.split(/\s+/).length;
		const postPath = relativePath
			? `${relativePath}/${path.basename(fileName, '.md')}`
			: path.basename(fileName, '.md');

		return {
			title: data.title || 'Untitled',
			date: data.date || new Date().toISOString().split('T')[0],
			category: data.category || relativePath || 'Uncategorized',
			tags: data.tags || [],
			content,
			wordCount,
			path: postPath
		};
	} catch (error) {
		console.error(`Error parsing ${filePath}:`, error);
		return null;
	}
}

// 특정 포스트 가져오기
export function getBlogPost(postPath: string): BlogPost | null {
	const fullPath = path.join(BLOG_DIR, `${postPath}.md`);

	if (!fs.existsSync(fullPath)) {
		return null;
	}

	const dir = path.dirname(postPath);
	const fileName = path.basename(postPath);

	return parseMarkdownFile(fullPath, dir, `${fileName}.md`);
}

// 모든 포스트 가져오기 (최근 글용)
export function getAllPosts(limit?: number): BlogPost[] {
	const posts: BlogPost[] = [];

	function traverseDirectory(dir: string, relativePath: string = '') {
		const items = fs.readdirSync(dir, { withFileTypes: true });

		for (const item of items) {
			const fullPath = path.join(dir, item.name);
			const newRelativePath = relativePath ? `${relativePath}/${item.name}` : item.name;

			if (item.isDirectory()) {
				traverseDirectory(fullPath, newRelativePath);
			} else if (item.name.endsWith('.md')) {
				const post = parseMarkdownFile(fullPath, relativePath, item.name);
				if (post) {
					posts.push(post);
				}
			}
		}
	}

	traverseDirectory(BLOG_DIR);

	// 날짜순으로 정렬 (최신순)
	posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	return limit ? posts.slice(0, limit) : posts;
}

