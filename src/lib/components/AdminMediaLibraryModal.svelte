<script lang="ts">
	import { browser } from '$app/environment';

	export type MediaRow = {
		path: string;
		kind: 'image' | 'audio';
		byte_size: number;
	};

	let {
		open = $bindable(false),
		onInsert
	}: {
		open: boolean;
		onInsert: (snippet: string) => void;
	} = $props();

	let items = $state<MediaRow[]>([]);
	let loading = $state(false);
	let filter = $state<'all' | 'image' | 'audio'>('all');

	$effect(() => {
		if (!browser || !open) return;
		loading = true;
		const q = filter === 'all' ? '' : `?kind=${filter}`;
		void fetch(`/admin/api/media${q}`, { credentials: 'include' })
			.then((r) => r.json())
			.then((d: { items?: MediaRow[] }) => {
				items = d.items ?? [];
			})
			.catch(() => {
				items = [];
			})
			.finally(() => {
				loading = false;
			});
	});

	$effect(() => {
		if (!browser || !open) return;
		const esc = (e: KeyboardEvent) => {
			if (e.key === 'Escape') open = false;
		};
		window.addEventListener('keydown', esc);
		return () => window.removeEventListener('keydown', esc);
	});

	function snippet(path: string, kind: string): string {
		const u = path.startsWith('http://') || path.startsWith('https://') ? path : encodeURI(path);
		if (kind === 'audio') {
			return `\n<audio controls src="${u}" preload="metadata"></audio>\n`;
		}
		return `\n<img src="${u}" alt="" loading="lazy" />\n`;
	}

	function pick(row: MediaRow) {
		onInsert(snippet(row.path, row.kind));
		open = false;
	}

	function formatBytes(n: number): string {
		if (n < 1024) return `${n} B`;
		if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
		return `${(n / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

{#if open}
	<div
		class="backdrop"
		role="button"
		tabindex="-1"
		onclick={() => (open = false)}
		onkeydown={(e) => e.key === 'Enter' && (open = false)}
		aria-label="닫기"
	></div>
	<div class="modal card" role="dialog" aria-modal="true" aria-labelledby="media-lib-title">
		<div class="head">
			<h2 id="media-lib-title" class="title">미디어 라이브러리</h2>
			<button type="button" class="icon-close" onclick={() => (open = false)} aria-label="닫기"
				>×</button
			>
		</div>
		<p class="sub">항목을 누르면 커서 위치에 삽입됩니다. (이미지·오디오)</p>
		<div class="filters">
			<button type="button" class:active={filter === 'all'} onclick={() => (filter = 'all')}
				>전체</button
			>
			<button type="button" class:active={filter === 'image'} onclick={() => (filter = 'image')}
				>이미지</button
			>
			<button type="button" class:active={filter === 'audio'} onclick={() => (filter = 'audio')}
				>오디오</button
			>
		</div>
		{#if loading}
			<p class="loading">불러오는 중…</p>
		{:else if items.length === 0}
			<p class="empty">
				항목이 없습니다. <code>static/</code> 아래에 미디어를 두거나 붙여넣기로 업로드하세요.
			</p>
		{:else}
			<ul class="grid">
				{#each items as row (row.path)}
					<li>
						<button type="button" class="tile" onclick={() => pick(row)}>
							{#if row.kind === 'image'}
								<img src={row.path} alt="" class="thumb" loading="lazy" />
							{:else}
								<div class="audio-badge">AUDIO</div>
							{/if}
							<span class="path">{row.path}</span>
							<span class="meta">{formatBytes(row.byte_size)}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 3500;
		background: color-mix(in srgb, var(--text) 35%, transparent);
	}

	.modal {
		position: fixed;
		z-index: 3501;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		width: min(92vw, 42rem);
		max-height: min(85vh, 640px);
		overflow: hidden;
		display: flex;
		flex-direction: column;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 12px;
		box-shadow: 0 16px 48px color-mix(in srgb, var(--text) 18%, transparent);
	}

	.card {
		padding: 0;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.85rem 1rem;
		border-bottom: 1px solid var(--border);
	}

	.title {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.icon-close {
		font: inherit;
		font-size: 1.5rem;
		line-height: 1;
		border: none;
		background: none;
		color: var(--text-tertiary);
		cursor: pointer;
		padding: 0.2rem 0.45rem;
		border-radius: 6px;
	}

	.icon-close:hover {
		color: var(--text);
		background: color-mix(in srgb, var(--text) 8%, transparent);
	}

	.sub {
		margin: 0;
		padding: 0.6rem 1rem 0;
		font-size: 0.78rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.filters {
		display: flex;
		gap: 0.4rem;
		padding: 0.65rem 1rem;
		flex-wrap: wrap;
	}

	.filters button {
		font: inherit;
		font-size: 0.78rem;
		padding: 0.25rem 0.6rem;
		border-radius: 6px;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
	}

	.filters button.active {
		border-color: var(--accent);
		color: var(--accent);
	}

	.loading,
	.empty {
		padding: 1rem;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.empty code {
		font-size: 0.72rem;
	}

	.grid {
		list-style: none;
		margin: 0;
		padding: 0.5rem 1rem 1rem;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-height: 52vh;
	}

	.tile {
		width: 100%;
		display: grid;
		grid-template-columns: 72px 1fr;
		grid-template-rows: auto auto;
		column-gap: 0.75rem;
		align-items: start;
		text-align: left;
		padding: 0.5rem 0.6rem;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: color-mix(in srgb, var(--bg-lighter) 88%, transparent);
		cursor: pointer;
		font: inherit;
		color: inherit;
	}

	.tile:hover {
		border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
	}

	.thumb {
		grid-row: 1 / span 2;
		width: 72px;
		height: 52px;
		object-fit: cover;
		border-radius: 6px;
		background: var(--border);
	}

	.audio-badge {
		grid-row: 1 / span 2;
		width: 72px;
		height: 52px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--text-secondary);
		background: color-mix(in srgb, var(--text) 8%, var(--bg));
		border-radius: 6px;
	}

	.path {
		grid-column: 2;
		font-size: 0.78rem;
		word-break: break-all;
		color: var(--text);
	}

	.meta {
		grid-column: 2;
		font-size: 0.72rem;
		color: var(--text-tertiary);
	}
</style>
