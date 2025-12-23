<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	// TODO: 실제 음악 데이터 로드
	let musics = $state<any[]>([]);

	onMount(() => {
		// 임시 음악 데이터
		musics = [
			{
				id: 1,
				title: '곡 제목 1',
				artist: 'Saens',
				album: '앨범명',
				year: 2024,
				duration: '3:45'
			},
			{
				id: 2,
				title: '곡 제목 2',
				artist: 'Saens',
				album: '앨범명',
				year: 2024,
				duration: '4:12'
			}
		];
	});
</script>

<main>
	<div class="container" transition:fly={{ duration: 500, x: 400 }}>
		<header>
			<h1>음악</h1>
			<p>음악 작업물과 플레이리스트</p>
		</header>

		<section class="musics">
			{#if musics.length === 0}
				<p class="empty">아직 등록된 음악이 없습니다.</p>
			{:else}
				<div class="music-list">
					{#each musics as music, index}
						<article class="music-item">
							<div class="music-number">{index + 1}</div>
							<div class="music-info">
								<h3 class="title">{music.title}</h3>
								<p class="meta">
									{music.artist} · {music.album} · {music.year}
								</p>
							</div>
							<div class="duration">{music.duration}</div>
						</article>
					{/each}
				</div>
			{/if}
		</section>
	</div>
</main>

<style>
	main {
		max-width: 900px;
		height: 100vh;
		margin: 0 auto;
		padding: 2rem;
	}

	header {
		text-align: center;
		padding: 3rem 0;
		border-bottom: 1px solid #e0e0e0;
		margin-bottom: 3rem;
	}

	header h1 {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
	}

	.empty {
		text-align: center;
		color: #666;
		padding: 4rem 0;
		font-size: 1.1rem;
	}

	.music-list {
		display: flex;
		flex-direction: column;
	}

	.music-item {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 1rem;
		border-bottom: 1px solid #e0e0e0;
		transition: background-color 0.2s;
	}

	.music-item:hover {
		background-color: #f8f8f8;
	}

	.music-number {
		font-size: 1.2rem;
		font-weight: 600;
		color: #666;
		min-width: 2rem;
		text-align: center;
	}

	.music-info {
		flex: 1;
	}

	.title {
		font-size: 1.1rem;
		margin: 0 0 0.3rem 0;
		font-weight: 600;
	}

	.meta {
		font-size: 0.9rem;
		color: #666;
		margin: 0;
	}

	.duration {
		font-size: 0.9rem;
		color: #666;
		font-variant-numeric: tabular-nums;
	}

	@media (max-width: 768px) {
		.music-number {
			display: none;
		}

		.music-item {
			flex-direction: column;
			align-items: start;
		}

		.duration {
			align-self: flex-end;
		}
	}
</style>

