/** 브라우저: 마크다운 에디터에 이미지/오디오 붙여넣기 → 업로드 후 HTML 조각 삽입 */

const DEFAULT_UPLOAD = '/admin/api/upload-media';

/** static/public URL (공백 등) 안전하게 속성값으로 */
export function encodePublicPath(p: string): string {
	if (p.startsWith('http://') || p.startsWith('https://')) return p;
	return encodeURI(p);
}

function snippetFor(url: string, kind: 'image' | 'audio'): string {
	const u = encodePublicPath(url);
	if (kind === 'image') {
		return `\n<img src="${u}" alt="" loading="lazy" />\n`;
	}
	return `\n<audio controls src="${u}" preload="metadata"></audio>\n`;
}

export function collectClipboardFiles(dt: DataTransfer): File[] {
	const out: File[] = [];
	if (dt.files?.length) {
		for (let i = 0; i < dt.files.length; i++) {
			out.push(dt.files[i]);
		}
	}
	if (!out.length && dt.items) {
		for (let i = 0; i < dt.items.length; i++) {
			const it = dt.items[i];
			if (it.kind !== 'file') continue;
			const f = it.getAsFile();
			if (f) out.push(f);
		}
	}
	return out.filter((f) => f.type.startsWith('image/') || f.type.startsWith('audio/'));
}

export type PasteUploadResult = { handled: boolean; uploaded: number };

export type UploadedMedia = { url: string; kind: 'image' | 'audio' };

export type UploadMediaOptions = {
	uploadUrl?: string;
	/** 정규화 전 원본 슬러그 (서버에서 normalizeSlug 처리) */
	slug?: string;
};

/** 관리자 업로드 API 한 건 */
export async function uploadMediaFile(
	file: File,
	opts: UploadMediaOptions | string = {}
): Promise<UploadedMedia | null> {
	const options: UploadMediaOptions = typeof opts === 'string' ? { uploadUrl: opts } : (opts ?? {});
	const uploadUrl = options.uploadUrl ?? DEFAULT_UPLOAD;
	const slug = options.slug?.trim() ?? '';
	if (!slug) {
		alert('미디어를 넣기 전에 슬러그를 입력해 주세요.');
		return null;
	}

	const kind: 'image' | 'audio' = file.type.startsWith('image/') ? 'image' : 'audio';
	const fd = new FormData();
	fd.append('file', file);
	fd.append('slug', slug);
	const res = await fetch(uploadUrl, { method: 'POST', body: fd, credentials: 'include' });
	if (!res.ok) {
		const t = await res.text().catch(() => '');
		alert(`업로드 실패 (${res.status}): ${t || res.statusText}`);
		return null;
	}
	const j = (await res.json()) as { url: string };
	return { url: j.url, kind };
}

/** @returns 처리한 미디어 파일 개수 (0이면 기본 붙여넣기 유지) */
export async function handleMarkdownMediaPaste(
	e: ClipboardEvent,
	textarea: HTMLTextAreaElement,
	getMarkdown: () => string,
	setMarkdown: (v: string) => void,
	opts: UploadMediaOptions = {}
): Promise<PasteUploadResult> {
	const dt = e.clipboardData;
	if (!dt) return { handled: false, uploaded: 0 };

	const mediaFiles = collectClipboardFiles(dt);
	if (!mediaFiles.length) return { handled: false, uploaded: 0 };

	e.preventDefault();

	let md = getMarkdown();
	let start = textarea.selectionStart;
	let end = textarea.selectionEnd;
	let uploaded = 0;

	for (const file of mediaFiles) {
		const up = await uploadMediaFile(file, opts);
		if (!up) continue;
		const sn = snippetFor(up.url, up.kind);
		const before = md.slice(0, start);
		const after = md.slice(end);
		md = before + sn + after;
		setMarkdown(md);
		uploaded++;
		start = end = before.length + sn.length;
		queueMicrotask(() => {
			textarea.selectionStart = start;
			textarea.selectionEnd = end;
			textarea.focus();
		});
	}

	return { handled: true, uploaded };
}
