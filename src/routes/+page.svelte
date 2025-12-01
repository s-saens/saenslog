<script lang="ts">
	import githubIcon from '$lib/assets/github.svg';
	import logo from '$lib/assets/logo.svg';
	import soundcloudIcon from '$lib/assets/soundcloud.svg';
	import tistoryIcon from '$lib/assets/tistory.svg';
</script>

<svelte:head>
	<title>Saens.kr - SANGHUN SONG</title>
</svelte:head>

<main>
	<div class="hero">
		<div class="logo">
			<img src={logo} alt="Saens Logo" />
		</div>

		<div class="info">
			<h1>SANGHUN SONG, 1999</h1>
			<p class="role">PRODUCT &nbsp;DEVELOPER</p>
			<p class="skills">GAME, APP, WEB, AI</p>
			<p class="status">WORKING AS A STAFF<br/>IN A MIDDLE SCHOOL</p>
		</div>

		<div class="contact">
			<a href="mailto:saens@saens.kr" class="email">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
					<polyline points="22,6 12,13 2,6"/>
				</svg>
				saens@saens.kr
			</a>
		</div>

		<div class="social">
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
		animation: float 6s ease-in-out infinite;
	}

	.logo img {
		width: 88px;
		height: 88px;
        padding: 10px;
		filter: drop-shadow(1 1 10px rgba(255, 255, 255, 0.3));
	}

	@keyframes float {
		0%, 100% {
			transform: translateY(0px);
		}
		50% {
			transform: translateY(-10px);
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
