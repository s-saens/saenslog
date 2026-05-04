import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';
import { renderMarkdownToHtml } from '$lib/server/markdown';

const BLOG_DIR = path.join(process.cwd(), 'static', 'blog');

export interface BlogPost {
	title: string;
	date: string;
	created?: string;
	updated?: string;
	publish: boolean;
	category: string;
	tags: string[];
	content: string;
	wordCount: number;
	path: string;
	tistory?: string;
}

export interface FolderInfo {
	name: string;
	path: string;
	folderCount: number;
	postCount: number;
	totalFolderCount: number;
	totalPostCount: number;
	date: string;
}

// 특정 경로의 파일 시스템 읽기 (새 구조: slug/post.md)
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
			// 폴더인 경우: post.md가 있는지 확인
			const itemPath = path.join(fullPath, item.name);
			const postMdPath = path.join(itemPath, 'post.md');
			
			if (fs.existsSync(postMdPath)) {
				// post.md가 있으면 이 폴더는 포스트
				const post = parseMarkdownFileFromPostMd(postMdPath, relativePath, item.name);
				if (post) {
					posts.push(post);
				}
			} else {
				// post.md가 없으면 진짜 폴더
				const { folderCount, postCount } = countDirectChildren(itemPath);
				const totalFolderCount = countAllFolders(itemPath);
				const totalPostCount = countAllPosts(itemPath);
				const lastModified = getLatestPostDate(itemPath);

				folders.push({
					name: item.name,
					path: relativePath ? `${relativePath}/${item.name}` : item.name,
					folderCount,
					postCount,
					totalFolderCount,
					totalPostCount,
					date: lastModified
				});
			}
		}
	}

	// 정렬: 폴더는 이름순, 포스트는 번호순
	folders.sort((a, b) => a.name.localeCompare(b.name));
	posts.sort((a, b) => {
		const aNum = parseSlugNumber(a.path);
		const bNum = parseSlugNumber(b.path);
		return aNum - bNum;
	});

	// publish가 false인 글은 리스트에 포함하지 않음
	const visiblePosts = posts.filter(p => p.publish !== false);

	return { folders, posts: visiblePosts };
}

// slug에서 번호 추출 (t9 -> 9, 20260417 -> 20260417)
function parseSlugNumber(slug: string): number {
	const match = slug.match(/[^\/]+$/);
	if (!match) return 0;
	const name = match[0];
	const numMatch = name.match(/\d+/);
	return numMatch ? parseInt(numMatch[0], 10) : 0;
}

// post.md 파일 파싱 (새 구조용)
function parseMarkdownFileFromPostMd(
	filePath: string,
	relativePath: string,
	slug: string
): BlogPost | null {
	try {
		const fileContents = fs.readFileSync(filePath, 'utf8');
		const { data, content } = matter(fileContents);

		const wordCount = content.split(/\s+/).length;
		const postPath = relativePath ? `${relativePath}/${slug}` : slug;

		// 날짜 파싱 헬퍼
		const parseDate = (val: unknown): string => {
			if (!val) return new Date().toISOString();
			if (val instanceof Date) return val.toISOString();
			return String(val);
		};

		// created, updated, date 처리
		const created = parseDate(data.created || data.date);
		const updated = parseDate(data.updated || data.date);
		const dateStr = parseDate(data.date);

		// publish 기본값은 true
		const publish = data.publish !== false;

		// 마크다운을 HTML로 변환
		const htmlContent = renderMarkdownToHtml(content);

		return {
			title: data.title || 'Untitled',
			date: dateStr,
			created,
			updated,
			publish,
			category: data.category || relativePath || '/',
			tags: data.tags || [],
			content: htmlContent,
			wordCount,
			path: postPath,
			...(data.tistory ? { tistory: String(data.tistory) } : {})
		};
	} catch (error) {
		console.error(`Error parsing ${filePath}:`, error);
		return null;
	}
}

// 바로 하위의 폴더 수와 포스트 수 세기 (새 구조)
function countDirectChildren(folderPath: string): { folderCount: number; postCount: number } {
	if (!fs.existsSync(folderPath)) {
		return { folderCount: 0, postCount: 0 };
	}

	const items = fs.readdirSync(folderPath, { withFileTypes: true });
	let folderCount = 0;
	let postCount = 0;

	for (const item of items) {
		if (item.isDirectory()) {
			const postMdPath = path.join(folderPath, item.name, 'post.md');
			if (fs.existsSync(postMdPath)) {
				postCount++;
			} else {
				folderCount++;
			}
		}
	}

	return { folderCount, postCount };
}

// 모든 하위 폴더를 포함한 전체 폴더 수 세기 (재귀) - 새 구조
function countAllFolders(folderPath: string): number {
	let count = 0;

	if (!fs.existsSync(folderPath)) {
		return 0;
	}

	const items = fs.readdirSync(folderPath, { withFileTypes: true });

	for (const item of items) {
		if (item.isDirectory()) {
			const postMdPath = path.join(folderPath, item.name, 'post.md');
			// post.md가 없는 폴더만 카운트
			if (!fs.existsSync(postMdPath)) {
				count++;
				count += countAllFolders(path.join(folderPath, item.name));
			}
		}
	}

	return count;
}

// 모든 하위 폴더를 포함한 전체 포스트 수 세기 (재귀) - 새 구조
function countAllPosts(folderPath: string): number {
	let count = 0;

	if (!fs.existsSync(folderPath)) {
		return 0;
	}

	const items = fs.readdirSync(folderPath, { withFileTypes: true });

	for (const item of items) {
		if (item.isDirectory()) {
			const postMdPath = path.join(folderPath, item.name, 'post.md');
			if (fs.existsSync(postMdPath)) {
				count++;
			} else {
				count += countAllPosts(path.join(folderPath, item.name));
			}
		}
	}

	return count;
}

// 폴더 내 모든 글들 중 가장 최신 날짜 가져오기 (새 구조)
function getLatestPostDate(folderPath: string): string {
	if (!fs.existsSync(folderPath)) {
		return '1999-01-01T00:00:00';
	}

	const dates: Date[] = [];

	function traverseForDates(dir: string) {
		const items = fs.readdirSync(dir, { withFileTypes: true });

		for (const item of items) {
			const fullPath = path.join(dir, item.name);

			if (item.isDirectory()) {
				const postMdPath = path.join(fullPath, 'post.md');
				if (fs.existsSync(postMdPath)) {
					// post.md 파일에서 날짜 읽기
					try {
						const fileContents = fs.readFileSync(postMdPath, 'utf8');
						const { data } = matter(fileContents);

						// date, created, updated 순서로 확인
						const dateValue = data.date ?? data.created ?? data.updated;
						if (dateValue) {
							const postDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
							if (!isNaN(postDate.getTime())) {
								dates.push(postDate);
							}
						}
					} catch {
						// 파일 읽기 오류 무시
					}
				} else {
					traverseForDates(fullPath);
				}
			}
		}
	}

	traverseForDates(folderPath);

	if (dates.length === 0) {
		return '1999-01-01T00:00:00';
	}

	const latestDate = dates.reduce((latest, current) => (current > latest ? current : latest));
	return latestDate.toISOString();
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

		// 마크다운을 HTML로 변환
		const htmlContent = renderMarkdownToHtml(content);

		// 날짜 처리: gray-matter가 Date 객체로 파싱할 수 있으므로 문자열로 변환
		let dateStr: string;
		if (data.date) {
			if (data.date instanceof Date) {
				dateStr = data.date.toISOString();
			} else {
				dateStr = String(data.date);
			}
		} else {
			dateStr = new Date().toISOString();
		}

		// publish 기본값은 true
		const publish = data.publish !== false;

		return {
			title: data.title || 'Untitled',
			date: dateStr,
			created: dateStr,
			updated: dateStr,
			publish,
			category: data.category || relativePath || '/',
			tags: data.tags || [],
			content: htmlContent,
			wordCount,
			path: postPath,
			...(data.tistory ? { tistory: String(data.tistory) } : {})
		};
	} catch (error) {
		console.error(`Error parsing ${filePath}:`, error);
		return null;
	}
}

/** 프론트매터 없는 마크다운 조각(프로젝트 설명 등)을 HTML로 */
export function renderMarkdownContent(markdown: string): string {
	return renderMarkdownToHtml(markdown);
}

// 특정 포스트 가져오기 (새 구조: slug/post.md)
export function getBlogPost(postPath: string): BlogPost | null {
	const fullPath = path.join(BLOG_DIR, postPath, 'post.md');

	if (!fs.existsSync(fullPath)) {
		return null;
	}

	const slug = path.basename(postPath);
	const dir = path.dirname(postPath);

	return parseMarkdownFileFromPostMd(fullPath, dir, slug);
}

// 특정 경로 하위의 모든 포스트 가져오기 (최근 글용)
export function getAllPosts(basePath: string = '', limit?: number): BlogPost[] {
	const posts: BlogPost[] = [];
	const startDir = path.join(BLOG_DIR, basePath);

	if (!fs.existsSync(startDir)) {
		return posts;
	}

	function traverseDirectory(dir: string, relativePath: string = '') {
		const items = fs.readdirSync(dir, { withFileTypes: true });

		for (const item of items) {
			const fullPath = path.join(dir, item.name);
			const newRelativePath = relativePath ? `${relativePath}/${item.name}` : item.name;

			if (item.isDirectory()) {
				const postMdPath = path.join(fullPath, 'post.md');
				if (fs.existsSync(postMdPath)) {
					// post.md가 있으면 포스트
					const post = parseMarkdownFileFromPostMd(postMdPath, relativePath, item.name);
					if (post) {
						posts.push(post);
					}
				} else {
					// 하위 디렉터리 재귀
					traverseDirectory(fullPath, newRelativePath);
				}
			}
		}
	}

	traverseDirectory(startDir, basePath);

	// publish가 false인 글은 리스트에 포함하지 않음
	const visiblePosts = posts.filter(p => p.publish !== false);

	// 날짜순으로 정렬 (최신순)
	visiblePosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	return limit ? visiblePosts.slice(0, limit) : visiblePosts;
}
