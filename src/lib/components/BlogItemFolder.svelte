<script lang="ts">
	import folderIcon from '$lib/assets/folder.svg';

	interface Props {
		name: string;
		path: string;
		count: number;
		date: string;
	}

	let { name, path, count, date }: Props = $props();
</script>

<a href="/blog/{path}" class="blog-item folder">
	<div class="icon">
		<img src={folderIcon} alt="folder" />
	</div>
	<div class="content">
		<div class="name">{name}</div>
		<div class="meta">
			<span class="count">{count}</span>
			<span class="separator">|</span>
			<span class="date">{date}</span>
		</div>
	</div>
</a>

<style>
	.blog-item {
		display: flex;
		align-items: center;
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
	}

	.icon img {
		width: 100%;
		height: 100%;
	}

	.content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex: 1;
		min-width: 0;
	}

	.name {
		font-weight: 400;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.meta {
		display: flex;
		gap: 0.5rem;
		color: var(--text-tertiary);
		font-size: 0.75rem;
		flex-shrink: 0;
		margin-left: 1rem;
	}

	.separator {
		color: var(--text-tertiary);
	}
</style>

