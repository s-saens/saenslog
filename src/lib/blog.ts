import fs from 'fs/promises';
import path from 'path';
import { dev } from '$app/environment';

export interface BlogPost {
	tag: string;
	number: number;
	title: string;
	description?: string;
	date: string;
	body: string;
	published: boolean;
}

const CONTENT_DIR = 'src/content/blog';

export async function getBlogPost(tag: string, number: number): Promise<BlogPost | null> {
	try {
		const filePath = path.join(CONTENT_DIR, tag, `${number}.md`);
		const content = await fs.readFile(filePath, 'utf-8');
		return parseMarkdown(content);
	} catch (error) {
		return null;
	}
}

export async function saveBlogPost(post: BlogPost): Promise<void> {
	const dirPath = path.join(CONTENT_DIR, post.tag);
	await fs.mkdir(dirPath, { recursive: true });
	
	const filePath = path.join(dirPath, `${post.number}.md`);
	const content = formatMarkdown(post);
	await fs.writeFile(filePath, content, 'utf-8');
}

export async function getBlogPostsByTag(tag: string): Promise<BlogPost[]> {
	try {
		const dirPath = path.join(CONTENT_DIR, tag);
		const files = await fs.readdir(dirPath);
		
		const posts = await Promise.all(
			files
				.filter((file) => file.endsWith('.md'))
				.map(async (file) => {
					const number = parseInt(file.replace('.md', ''));
					return await getBlogPost(tag, number);
				})
		);
		
		return posts
			.filter((post): post is BlogPost => post !== null && post.published)
			.sort((a, b) => {
				const numA = a.number;
				const numB = b.number;
				return numB - numA;
			});
	} catch (error) {
		return [];
	}
}

export async function getAllTags(): Promise<string[]> {
	try {
		const dirs = await fs.readdir(CONTENT_DIR);
		return dirs.filter((dir) => {
			const dirPath = path.join(CONTENT_DIR, dir);
			return fs.stat(dirPath).then((stat) => stat.isDirectory());
		});
	} catch (error) {
		return [];
	}
}

export async function getNextNumberForTag(tag: string): Promise<number> {
	try {
		const dirPath = path.join(CONTENT_DIR, tag);
		const files = await fs.readdir(dirPath);
		
		const numbers = files
			.filter((file) => file.endsWith('.md'))
			.map((file) => parseInt(file.replace('.md', '')))
			.filter((num) => !isNaN(num));
		
		return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
	} catch (error) {
		return 1;
	}
}

function parseMarkdown(content: string): BlogPost {
	const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
	const match = content.match(frontmatterRegex);
	
	if (!match) {
		throw new Error('Invalid markdown format');
	}
	
	const frontmatter = match[1];
	const body = match[2];
	
	const metadata: Record<string, any> = {};
	frontmatter.split('\n').forEach((line) => {
		const colonIndex = line.indexOf(':');
		if (colonIndex > 0) {
			const key = line.substring(0, colonIndex).trim();
			const value = line.substring(colonIndex + 1).trim();
			metadata[key] = value;
		}
	});
	
	return {
		tag: metadata.tag || '',
		number: parseInt(metadata.number) || 1,
		title: metadata.title || '',
		description: metadata.description || '',
		date: metadata.date || new Date().toISOString(),
		body: body.trim(),
		published: metadata.published !== 'false'
	};
}

function formatMarkdown(post: BlogPost): string {
	const frontmatter = `---
tag: ${post.tag}
number: ${post.number}
title: ${post.title}
description: ${post.description || ''}
date: ${post.date}
published: ${post.published}
---

${post.body}`;
	
	return frontmatter;
}

