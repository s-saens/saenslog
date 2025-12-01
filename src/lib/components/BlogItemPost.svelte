<script lang="ts">
	import postIcon from '$lib/assets/post.svg';
	import textCountIcon from '$lib/assets/text-count.svg';

	interface Props {
		title: string;
		path: string;
		category: string;
		date: string;
		wordCount: number;
	}

	let { title, path, category, date, wordCount }: Props = $props();
</script>

<a href="/blog/{path}" class="blog-item post">
	<div class="icon">
		<img src={postIcon} alt="post" />
	</div>
	<div class="content">
		<div class="title">{title}</div>
		<div class="meta">
			<span class="category">{category}</span>
			<span class="separator">|</span>
			<span class="date">{date}</span>
			<span class="separator">|</span>
			<span class="word-count">
				<img src={textCountIcon} alt="words" class="text-count-icon" />
				{wordCount}
			</span>
		</div>
	</div>
</a>

<style>
	.blog-item {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.5rem 0;
		text-decoration: none;
		color: var(--text);
		transition: opacity 0.2s;
		font-size: 0.85rem;
	}

	.blog-item:hover {
		opacity: 0.7;
	}

	.icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		flex-shrink: 0;
		margin-top: 0.15rem;
	}

	.icon img {
		width: 100%;
		height: 100%;
	}

	.content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		min-width: 0;
	}

	.title {
		font-weight: 400;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.meta {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		color: var(--text-tertiary);
		font-size: 0.7rem;
	}

	.separator {
		color: var(--text-tertiary);
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

