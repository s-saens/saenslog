<script lang="ts">
	import folderMultiIcon from '$lib/assets/folder-multi.svg';
	import folderIcon from '$lib/assets/folder.svg';
	import postMultiIcon from '$lib/assets/post-multi.svg';

	interface Props {
		name: string;
		path: string;
		folderCount: number;
		postCount: number;
		totalFolderCount: number;
		totalPostCount: number;
		date: string;
	}

	let { name, path, folderCount, postCount, totalFolderCount, totalPostCount, date }: Props = $props();
	
	// 날짜 형식: YYYY-MM-DD hh:mm:ss GMT+9
	const formatDate = (dateStr: string) => {
		if (!dateStr) return '';
		const d = new Date(dateStr);
		// 연도가 2000년 미만이면 빈 문자열 반환
		if (d.getFullYear() < 2000) {
			return '';
		}
		const year = d.getFullYear();
		const month = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		const hours = String(d.getHours()).padStart(2, '0');
		const minutes = String(d.getMinutes()).padStart(2, '0');
		return `Latest Post : ${year}-${month}-${day} ${hours}:${minutes}`;
	};
</script>

<a href="/blog/{path}" class="blog-item folder">
	<div class="icon">
		<img src={folderIcon} alt="folder" />
	</div>
	<div class="title">{name}</div>
	<div class="date">{formatDate(date)}</div>
	<div class="info-row1">
		<span class="count-item">
			<img src={folderMultiIcon} alt="total folders" class="count-icon" />
			{totalFolderCount}
		</span>
	</div>
	<div class="info-row2">
		<span class="count-item">
			<img src={postMultiIcon} alt="total posts" class="count-icon" />
			{totalPostCount}
		</span>
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

	.icon img {
		width: 100%;
		height: 100%;
	}

	.title {
		grid-row: 1;
		font-weight: 400;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
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
		gap: 0.5rem;
		align-items: center;
		justify-content: flex-end;
		color: var(--text-tertiary);
		font-size: 0.7rem;
	}

	.info-row2 {
		grid-row: 2;
		grid-column: 3;
		display: flex;
		gap: 0.5rem;
		align-items: center;
		justify-content: flex-end;
		color: var(--text-tertiary);
		font-size: 0.7rem;
	}
	
	.count-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.count-icon {
		width: 10px;
		height: 10px;
		opacity: 0.7;
	}
</style>

