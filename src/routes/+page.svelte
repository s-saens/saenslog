<script lang="ts">
	import { CopyIcon, GithubIcon, LogoIcon, MailIcon, SoundcloudIcon, TistoryIcon } from '$lib/components/icons';
	import { onMount } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	const EMAIL = 'saens@saens.kr';
	let hovered = $state<string | null>(null);
	let copied = $state(false);
	let mounted = $state(false);

	onMount(() => {
		mounted = true;
	});

	async function copyEmail(e: MouseEvent) {
		e.preventDefault();
		await navigator.clipboard.writeText(EMAIL);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<main>
	{#if mounted}
	<div class="hero" transition:fly={{ duration: 500, x: -100 }}>
		<div class="logo enter-1">
			<LogoIcon width={88} height={88} />
		</div>

		<div class="social enter-7">
			<div class="icon-wrapper" role="none" onmouseenter={() => (hovered = 'github')} onmouseleave={() => (hovered = null)} transition:fly={{ duration: 150, y: 20, delay: 500 }}>
				<a href="https://github.com/s-saens" target="_blank" rel="noopener noreferrer" class="social-icon">
					<GithubIcon />
				</a>
				{#if hovered === 'github'}
					<div class="tooltip" transition:fade={{ duration: 150 }}>GitHub</div>
				{/if}
			</div>

			<div class="icon-wrapper" role="none" onmouseenter={() => (hovered = 'tistory')} onmouseleave={() => (hovered = null)} transition:fly={{ duration: 150, y: 20, delay: 600 }}>
				<a href="https://saens.tistory.com" target="_blank" rel="noopener noreferrer" class="social-icon">
					<TistoryIcon />
				</a>
				{#if hovered === 'tistory'}
					<div class="tooltip" transition:fade={{ duration: 150 }}>Tistory</div>
				{/if}
			</div>

			<div class="icon-wrapper" role="none" onmouseenter={() => (hovered = 'soundcloud')} onmouseleave={() => (hovered = null)} transition:fly={{ duration: 150, y: 20, delay: 700 }}>
				<a href="https://soundcloud.com/s-saens" target="_blank" rel="noopener noreferrer" class="social-icon">
					<SoundcloudIcon />
				</a>
				{#if hovered === 'soundcloud'}
					<div class="tooltip" transition:fade={{ duration: 150 }}>SoundCloud</div>
				{/if}
			</div>

			<div
				class="icon-wrapper icon-wrapper--email"
				role="none"
				onmouseenter={() => (hovered = 'email')}
				onmouseleave={() => (hovered = null)}
				transition:fly={{ duration: 150, y: 20, delay: 800 }}
			>
				<a href="mailto:{EMAIL}" class="social-icon">
					<MailIcon />
				</a>
				{#if hovered === 'email'}
					<div class="tooltip" transition:fade={{ duration: 150 }}>
						<span>{EMAIL}</span>
						<button class="copy-btn" onclick={copyEmail} title="이메일 복사">
							{#if copied}
								<span class="copied-text">복사됨</span>
							{:else}
								<CopyIcon width={14} height={14} />
							{/if}
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
	{/if}
</main>

<style>
	/* 진입 애니메이션 */
	@keyframes enter-fade-up {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes enter-logo {
		0% {
			opacity: 0;
			transform: scale(0.5) rotateY(-180deg);
		}
		60% {
			opacity: 1;
			transform: scale(1.1) rotateY(20deg);
		}
		100% {
			opacity: 1;
			transform: scale(1) rotateY(0deg);
		}
	}

	.enter-1 {
		animation: enter-logo 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
	}

	main {
		width: 100%;
		height: 100vh;
		color: var(--text);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
		padding: 2rem;
	}

	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: justify;
		gap: 1.2rem;
        width: 12.5rem;
	}

	.logo {
		margin-bottom: 1rem;
		perspective: 800px;
	}

	.logo :global(svg) {
		width: 88px;
		height: 88px;
		padding: 10px;
		animation: logo-dance 8s ease-in-out infinite;
		transform-style: preserve-3d;
		transition: all 0.4s ease;
	}

	@keyframes logo-dance {
		0%, 100% {
			transform: rotateY(0deg) rotateX(0deg);
		}
		12.5% {
			transform: rotateY(8deg) rotateX(4deg);
		}
		25% {
			transform: rotateY(0deg) rotateX(6deg);
		}
		37.5% {
			transform: rotateY(-8deg) rotateX(4deg);
		}
		50% {
			transform: rotateY(0deg) rotateX(0deg);
		}
		62.5% {
			transform: rotateY(8deg) rotateX(-4deg);
		}
		75% {
			transform: rotateY(0deg) rotateX(-6deg);
		}
		87.5% {
			transform: rotateY(-8deg) rotateX(-4deg);
		}
	}

	.social {
		display: flex;
		gap: 1.5rem;
		margin-top: 2rem;
	}

	.icon-wrapper {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* 아이콘·툴팁 사이 hover 브리지 (패딩 확장은 툴팁 위치를 깨뜨림) */
	.icon-wrapper--email::before {
		content: '';
		position: absolute;
		bottom: 100%;
		left: 50%;
		transform: translateX(-50%);
		width: min(260px, 85vw);
		height: 3.25rem;
		pointer-events: auto;
		z-index: 1;
	}

	.social-icon {
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.5;
	}

	.social-icon:hover {
		opacity: 1;
		transform: translateY(-2px);
	}

	.social-icon :global(svg) {
		width: 24px;
		height: 24px;
	}

	.tooltip {
		position: absolute;
		bottom: calc(100% + 10px);
		left: 50%;
		transform: translateX(-50%);
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 8px;
		padding: 6px 10px;
		display: flex;
		align-items: center;
		gap: 8px;
		white-space: nowrap;
		font-size: 0.78rem;
		color: var(--text);
		pointer-events: auto;
		z-index: 10;
	}

	.tooltip::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: 5px solid transparent;
		border-top-color: var(--border);
	}

	.copy-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		color: var(--text);
		opacity: 0.6;
		transition: opacity 0.2s ease;
		min-width: 14px;
	}

	.copy-btn:hover {
		opacity: 1;
	}

	.copied-text {
		font-size: 0.72rem;
		color: var(--text-tertiary, #888);
	}

	@media (max-width: 768px) {
		.logo :global(svg) {
			width: 80px;
			height: 80px;
		}

		.social {
			gap: 1rem;
		}

		.social-icon :global(svg) {
			width: 20px;
			height: 20px;
		}
	}
</style>
