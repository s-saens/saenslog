import { readdirSync, statSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = join(__dirname, '..', 'src', 'lib', 'blog');
const DEST_DIR = join(__dirname, '..', 'static', 'blog');

const EXCLUDED_EXTENSIONS = new Set(['.md']);

function syncDir(srcDir, destDir) {
	if (!existsSync(srcDir)) return;

	const entries = readdirSync(srcDir, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = join(srcDir, entry.name);
		const destPath = join(destDir, entry.name);

		if (entry.isDirectory()) {
			syncDir(srcPath, destPath);
		} else if (entry.isFile()) {
			const ext = entry.name.slice(entry.name.lastIndexOf('.'));
			if (EXCLUDED_EXTENSIONS.has(ext)) continue;

			mkdirSync(destDir, { recursive: true });
			copyFileSync(srcPath, destPath);

			const rel = relative(join(__dirname, '..'), destPath);
			console.log(`  copied: ${rel}`);
		}
	}
}

console.log('Syncing blog assets...');
syncDir(SRC_DIR, DEST_DIR);
console.log('Done.');
