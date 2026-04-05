<script lang="ts">
	import { PostIcon, TextCountIcon, TistoryIcon } from '$lib/components/icons';

	interface Props {
		title: string;
		path: string;
		category: string;
		date: string;
		wordCount: number;
		tistory?: string;
	}

	let { title, path, category, date, wordCount, tistory }: Props = $props();
	
	// 날짜 형식: YYYY-MM-DD hh:mm:ss GMT+9
	const formatDate = (dateStr: string) => {
		if (!dateStr) return '';
		const d = new Date(dateStr);
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		const hours = String(d.getHours()).padStart(2, '0');
		const minutes = String(d.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day} ${hours}:${minutes} (GMT+9)`;
	};
</script>

<a href="/blog/{path}" class="blog-item post">
	<div class="icon">
		<PostIcon />
	</div>
	<div class="title">
		<span class="title-text">{title}</span>
		{#if tistory}
			<a href={tistory} target="_blank" rel="noopener noreferrer" class="tistory-link" aria-label="티스토리에서 보기">
				<TistoryIcon width={18} height={18} />
			</a>
		{/if}
	</div>
	<div class="date">{formatDate(date)}</div>
	<div class="info-row1">
		<span class="word-count">
			<TextCountIcon width={10} height={10} class="text-count-icon" />
			{wordCount}
		</span>
	</div>
	<div class="info-row2">
		<span class="category">{category}</span>
	</div>
</a>

<style>
	.blog-item {
		display: grid;
		grid-template-columns: 14px 1fr auto;
		grid-template-rows: auto auto;
		column-gap: 0.75rem;
		row-gap: 0.2rem;

		margin: 0.7rem 0.9rem;
		padding: 0.1rem 0.1rem;

		text-decoration: none;
		color: var(--text);
		transition: opacity 0.2s;
		font-size: 0.85rem;
		transition: margin 0.15s ease-in-out, padding 0.15s ease-in-out, background-color 0.2s ease-in-out;
		border-radius: 0.6rem;
	}

	.blog-item:hover {
		margin: 0;
		padding: 0.8rem 1rem;
		background-color: var(--bg-lighter);
		transition: margin 0.15s ease-in-out, padding 0.15s ease-in-out, background-color 0.2s ease-in-out;
	}

	.icon {
		grid-row: 1 / 3;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		flex-shrink: 0;
	}

	.icon :global(svg) {
		width: 100%;
		height: 100%;
	}

	.title {
		grid-row: 1;
		font-weight: 400;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		overflow: visible;
	}

	.title-text {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	.tistory-link {
		position: relative;
		display: flex;
		align-items: center;
		flex-shrink: 0;
		color: var(--text-tertiary);
		transition: color 0.2s, opacity 0.2s;
	}

	.tistory-link::after {
		content: 'Tistory에서 보기';
		position: absolute;
		bottom: calc(100% + 8px);
		left: 50%;
		transform: translateX(-50%) translateY(4px);
		background: color-mix(in srgb, var(--text) 90%, transparent);
		color: var(--bg);
		font-size: 0.72rem;
		font-weight: 500;
		letter-spacing: 0.01em;
		white-space: nowrap;
		padding: 0.3rem 0.6rem;
		border-radius: 6px;
		pointer-events: none;
		opacity: 0;
		transition: opacity 0.15s ease, transform 0.15s ease;
		z-index: 10;
	}

	.tistory-link:hover::after {
		opacity: 1;
		transform: translateX(-50%) translateY(0);
	}

	.tistory-link:hover {
		color: var(--text);
		opacity: 0.7;
	}

	.date {
		grid-row: 2;
		grid-column: 2;
		color: var(--text-tertiary);
		font-size: 0.7rem;
	}

	.info-row1 {
		grid-row: 1;
		grid-column: 3;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		color: var(--text-tertiary);
		font-size: 0.7rem;
	}

	.info-row2 {
		grid-row: 2;
		grid-column: 3;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		color: var(--text-tertiary);
		font-size: 0.7rem;
	}

	.category {
		font-family: var(--font-mono);
	}

	.category {
		font-family: var(--font-mono);
	}

	.word-count {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.text-count-icon {
		width: 10px;
		height: 10px;
		opacity: 0.7;
	}
</style>

