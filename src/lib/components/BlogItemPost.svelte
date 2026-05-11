<script lang="ts">
	import { hrefBlogPath } from '$lib/appPaths';
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

	const formatDate = (dateStr: string) => {
		if (!dateStr) return '';
		const d = new Date(dateStr);
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		const hours = String(d.getHours()).padStart(2, '0');
		const minutes = String(d.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day} ${hours}:${minutes}`;
	};

	let titleEl: HTMLSpanElement | null = null;
	let isOverflowing = $state(false);

	$effect(() => {
		if (titleEl) {
			const update = () => {
				isOverflowing = titleEl!.scrollWidth > titleEl!.clientWidth;
			};
			update();
			const observer = new ResizeObserver(update);
			observer.observe(titleEl);
			return () => observer.disconnect();
		}
	});
</script>

<!-- 카드 전체는 .card-link 오버레이, 티스토리는 z-index로 분리 (중첩 <a> 방지) -->
<div class="blog-item post" class:overflowing={isOverflowing} data-title={title}>
	<a href={hrefBlogPath(path)} class="card-link" aria-label="블로그 글: {title}"></a>
	<div class="icon">
		<PostIcon />
	</div>
	<div class="title">
		<span class="title-text" bind:this={titleEl}>{title}</span>
		{#if tistory}
			<a
				href={tistory}
				target="_blank"
				rel="noopener noreferrer"
				class="tistory-link"
				aria-label="티스토리에서 보기"
			>
				<TistoryIcon width={18} height={18} />
			</a>
		{/if}
	</div>
	<div class="date">{formatDate(date)}</div>
	<div class="info-row1">
		<span class="word-count">
			<TextCountIcon width={10} height={10} />
			{wordCount}
		</span>
	</div>
	<div class="info-row2">
		<span class="category">{category}</span>
	</div>
</div>

<style>
	.blog-item {
		position: relative;
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
		transition:
			margin 0.15s ease-in-out,
			padding 0.15s ease-in-out,
			background-color 0.2s ease-in-out;
		border-radius: 0.6rem;
	}

	.card-link {
		position: absolute;
		inset: 0;
		z-index: 0;
		border-radius: inherit;
	}

	.blog-item > :not(.card-link) {
		position: relative;
		z-index: 1;
		pointer-events: none;
	}

	.tistory-link {
		pointer-events: auto;
		z-index: 2;
	}

	.blog-item:hover {
		margin: 0;
		padding: 0.8rem 1rem;
		background-color: var(--bg-lighter);
		transition:
			margin 0.15s ease-in-out,
			padding 0.15s ease-in-out,
			background-color 0.2s ease-in-out;
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
		position: relative;
		grid-row: 1;
		font-weight: 400;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		min-width: 0;
	}

	.title-text {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		min-width: 0;
	}

	.blog-item.overflowing:hover::after {
		content: attr(data-title);
		position: absolute;
		bottom: calc(100% + 6px);
		left: calc(14px + 0.75rem);
		transform: translateY(4px);
		background: color-mix(in srgb, var(--text) 92%, transparent);
		color: var(--bg);
		font-size: 0.75rem;
		font-weight: 400;
		line-height: 1.5;
		padding: 0.4rem 0.7rem;
		border-radius: 6px;
		pointer-events: none;
		opacity: 0;
		transition:
			opacity 0.15s ease,
			transform 0.15s ease;
		white-space: normal;
		max-width: 320px;
		z-index: 20;
	}

	.blog-item.overflowing:hover::after {
		opacity: 1;
		transform: translateY(0);
	}

	.tistory-link {
		position: relative;
		display: flex;
		align-items: center;
		flex-shrink: 0;
		color: var(--text-tertiary);
		transition:
			color 0.2s,
			opacity 0.2s;
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
		transition:
			opacity 0.15s ease,
			transform 0.15s ease;
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
		position: relative;
		grid-row: 2;
		grid-column: 2;
		color: var(--text-tertiary);
		font-size: 0.7rem;
		cursor: default;
	}

	.date::after {
		content: 'GMT+9';
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		transform: translateY(-4px);
		background: color-mix(in srgb, var(--text) 92%, transparent);
		color: var(--bg);
		font-size: 0.7rem;
		font-weight: 500;
		padding: 0.2rem 0.5rem;
		border-radius: 5px;
		pointer-events: none;
		opacity: 0;
		transition:
			opacity 0.15s ease,
			transform 0.15s ease;
		white-space: nowrap;
		z-index: 10;
	}

	.date:hover::after {
		opacity: 1;
		transform: translateY(0);
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

	.word-count {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
</style>
