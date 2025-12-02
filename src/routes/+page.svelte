<script lang="ts">
	import githubIcon from '$lib/assets/github.svg';
	import logo from '$lib/assets/logo.svg';
	import soundcloudIcon from '$lib/assets/soundcloud.svg';
	import tistoryIcon from '$lib/assets/tistory.svg';
</script>

<svelte:head>
	<title>SAENS</title>
</svelte:head>

<main>
	<div class="hero">
		<div class="logo enter-1">
			<img src={logo} alt="Saens Logo" />
		</div>

		<div class="info">
			<h1 class="enter-2">SANGHUN SONG, 1999</h1>
			<p class="role enter-3">PRODUCT &nbsp;DEVELOPER</p>
			<p class="skills enter-4">GAME, APP, WEB, AI</p>
			<p class="status enter-5">WORKING AS A STAFF<br/>IN A MIDDLE SCHOOL</p>
		</div>

		<div class="contact enter-6">
			<a href="mailto:saens@saens.kr" class="email">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
					<polyline points="22,6 12,13 2,6"/>
				</svg>
				saens@saens.kr
			</a>
		</div>

		<div class="social enter-7">
			<a href="https://github.com/saens" target="_blank" rel="noopener noreferrer" title="GitHub">
				<img src={githubIcon} alt="GitHub" />
			</a>
			<a href="https://tistory.com" target="_blank" rel="noopener noreferrer" title="Tistory">
				<img src={tistoryIcon} alt="Tistory" />
			</a>
			<a href="https://soundcloud.com" target="_blank" rel="noopener noreferrer" title="SoundCloud">
				<img src={soundcloudIcon} alt="SoundCloud" />
			</a>
		</div>
	</div>
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

	.enter-2 {
		opacity: 0;
		animation: enter-fade-up 0.6s ease-out 0.4s forwards;
	}

	.enter-3 {
		opacity: 0;
		animation: enter-fade-up 0.6s ease-out 0.55s forwards;
	}

	.enter-4 {
		opacity: 0;
		animation: enter-fade-up 0.6s ease-out 0.7s forwards;
	}

	.enter-5 {
		opacity: 0;
		animation: enter-fade-up 0.6s ease-out 0.85s forwards;
	}

	.enter-6 {
		opacity: 0;
		animation: enter-fade-up 0.6s ease-out 1s forwards;
	}

	.enter-7 {
		opacity: 0;
		animation: enter-fade-up 0.6s ease-out 1.15s forwards;
	}

	main {
		width: 100%;
		height: 100vh;
		background-color: var(--bg);
		color: var(--text);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
		padding: 2rem;
		overflow: hidden;
	}

	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: justify;
		gap: 1.2rem;
        width: 200px;
	}

	.logo {
		margin-bottom: 1rem;
		perspective: 800px;
	}

	.logo img {
		width: 88px;
		height: 88px;
		padding: 10px;
		animation: logo-dance 8s ease-in-out infinite, logo-pulse 4s ease-in-out infinite;
		transform-style: preserve-3d;
		transition: all 0.4s ease;
	}


	@keyframes logo-pulse {
		0%, 100% {
			opacity: 0.15;
			filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.1));
		}
		50% {
			opacity: 1;
			filter: drop-shadow(0 0 30px rgba(255, 255, 255, 0.5));
		}
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

	.info {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		text-align: justify;
	}

	.info h1 {
		font-size: 0.95rem;
		font-weight: 400;
		letter-spacing: 0.1em;
		margin: 0;
		color: var(--text);
	}

	.info p {
		font-size: 0.95rem;
		font-weight: 400;
		letter-spacing: 0.1em;
		margin: 0;
		color: var(--text-secondary);
	}

	.role {
		margin-top: 1rem;
	}

	.skills {
		color: var(--text-secondary);
	}

	.status {
		margin-top: 1rem;
		color: var(--text-tertiary);
		font-size: 0.85rem;
	}

	.contact {
		margin-top: 2rem;
        width: 100%;
        text-align: center;
	}

	.email {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text);
		text-decoration: none;
		font-size: 0.95rem;
		letter-spacing: 0.05em;
		transition: all 0.3s ease;
		padding: 0.5rem 1rem;
		border: 1px solid var(--border);
		border-radius: 4px;
	}

	.email:hover {
		color: var(--text);
		border-color: var(--text-tertiary);
	}

	.social {
		display: flex;
		gap: 1.5rem;
		margin-top: 2rem;
	}

	.social a {
		transition: all 0.3s ease;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.5;
	}

	.social a:hover {
		opacity: 1;
		transform: translateY(-2px);
	}

	.social a img {
		width: 24px;
		height: 24px;
	}

	@media (max-width: 768px) {
		.logo img {
			width: 80px;
			height: 80px;
		}

		.info h1 {
			font-size: 0.9rem;
		}

		.info p {
			font-size: 0.8rem;
		}

		.email {
			font-size: 0.85rem;
		}

		.social {
			gap: 1rem;
		}

		.social a img {
			width: 20px;
			height: 20px;
		}
	}
</style>
