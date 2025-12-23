<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	interface Props {
		data: {
			projects: Array<{
				id: string;
				title: string;
				tags: string[];
				startDate: string;
				endDate: string;
				logoPath: string;
			}>;
		};
	}

	let { data }: Props = $props();

	let selectedIndex = $state(0);
	let carouselRef: HTMLDivElement;
	let isDragging = $state(false);
	let startX = $state(0);
	let scrollLeft = $state(0);
	let hasDragged = $state(false);

	$effect(() => {
		if (carouselRef && !isDragging) {
			// 선택된 프로젝트가 중앙에 오도록 스크롤
			const carousel = carouselRef;
			const items = carousel.querySelectorAll('.carousel-item');
			if (items[selectedIndex]) {
				const item = items[selectedIndex] as HTMLElement;
				const itemLeft = item.offsetLeft;
				const itemWidth = item.offsetWidth;
				const carouselWidth = carousel.offsetWidth;
				const scrollPosition = itemLeft - (carouselWidth / 2) + (itemWidth / 2);
				carousel.scrollTo({ left: scrollPosition, behavior: 'smooth' });
			}
		}
	});

	function handleMouseDown(e: MouseEvent) {
		if (!carouselRef) return;
		isDragging = true;
		hasDragged = false;
		startX = e.pageX - carouselRef.offsetLeft;
		scrollLeft = carouselRef.scrollLeft;
		carouselRef.style.cursor = 'grabbing';
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging || !carouselRef) return;
		e.preventDefault();
		const x = e.pageX - carouselRef.offsetLeft;
		const walk = (x - startX) * 2;
		const distance = Math.abs(walk);
		
		if (distance > 5) {
			hasDragged = true;
		}
		
		carouselRef.scrollLeft = scrollLeft - walk;
	}

	function handleMouseUp() {
		if (!carouselRef) return;
		isDragging = false;
		carouselRef.style.cursor = 'grab';
		updateSelectedIndexFromScroll();
		
		// 드래그 상태를 약간 지연 후 리셋 (클릭 이벤트보다 먼저 처리되도록)
		setTimeout(() => {
			hasDragged = false;
		}, 100);
	}

	function handleTouchStart(e: TouchEvent) {
		if (!carouselRef) return;
		isDragging = true;
		hasDragged = false;
		startX = e.touches[0].pageX - carouselRef.offsetLeft;
		scrollLeft = carouselRef.scrollLeft;
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isDragging || !carouselRef) return;
		const x = e.touches[0].pageX - carouselRef.offsetLeft;
		const walk = (x - startX) * 2;
		const distance = Math.abs(walk);
		
		if (distance > 5) {
			hasDragged = true;
		}
		
		carouselRef.scrollLeft = scrollLeft - walk;
	}

	function handleTouchEnd() {
		isDragging = false;
		updateSelectedIndexFromScroll();
		
		// 드래그 상태를 약간 지연 후 리셋
		setTimeout(() => {
			hasDragged = false;
		}, 100);
	}

	function handleWheel(e: WheelEvent) {
		if (!carouselRef) return;
		if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
			e.preventDefault();
			carouselRef.scrollLeft += e.deltaX || e.deltaY;
			updateSelectedIndexFromScroll();
		}
	}

	function updateSelectedIndexFromScroll() {
		if (!carouselRef) return;
		const carousel = carouselRef;
		const items = carousel.querySelectorAll('.carousel-item');
		const carouselCenter = carousel.scrollLeft + carousel.offsetWidth / 2;

		let closestIndex = 0;
		let closestDistance = Infinity;

		items.forEach((item, index) => {
			const itemElement = item as HTMLElement;
			const itemCenter = itemElement.offsetLeft + itemElement.offsetWidth / 2;
			const distance = Math.abs(carouselCenter - itemCenter);

			if (distance < closestDistance) {
				closestDistance = distance;
				closestIndex = index;
			}
		});

		selectedIndex = closestIndex;
	}

	function handleProjectClick(index: number) {
		// 드래그 중이었다면 클릭 이벤트 무시
		if (hasDragged) {
			return;
		}
		
		if (index === selectedIndex) {
			// 현재 선택된 프로젝트를 클릭하면 상세 페이지로 이동
			goto(`/projects/${data.projects[index].title}`);
		} else {
			// 다른 프로젝트를 클릭하면 해당 프로젝트를 선택
			selectedIndex = index;
		}
	}

	onMount(() => {
		if (carouselRef) {
			// DOM이 완전히 렌더링된 후 스크롤 위치 조정
			requestAnimationFrame(() => {
				if (carouselRef) {
					const carousel = carouselRef;
					const items = carousel.querySelectorAll('.carousel-item');
					if (items[selectedIndex]) {
						const item = items[selectedIndex] as HTMLElement;
						const itemLeft = item.offsetLeft;
						const itemWidth = item.offsetWidth;
						const carouselWidth = carousel.offsetWidth;
						const scrollPosition = itemLeft - (carouselWidth / 2) + (itemWidth / 2);
						carousel.scrollLeft = scrollPosition;
					}
				}
			});
		}
	});
</script>

<main>
	<div class="content-wrapper" transition:fly={{ duration: 500, y: 100 }}>
		<div class="header-section">
			<h1 class="project-title">{data.projects[selectedIndex]?.title || ''}</h1>
			<div class="tags">
				{#each data.projects[selectedIndex]?.tags || [] as tag}
					<span class="tag">{tag.toUpperCase()}</span>
				{/each}
			</div>
		</div>

		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="carousel-container"
			bind:this={carouselRef}
			onmousedown={handleMouseDown}
			onmousemove={handleMouseMove}
			onmouseup={handleMouseUp}
			onmouseleave={handleMouseUp}
			ontouchstart={handleTouchStart}
			ontouchmove={handleTouchMove}
			ontouchend={handleTouchEnd}
			onwheel={handleWheel}
			role="region"
			aria-label="프로젝트 캐로셀"
		>
			<div class="carousel-track">
				{#each data.projects as project, index}
					<button
						class="carousel-item"
						class:selected={index === selectedIndex}
						onclick={() => handleProjectClick(index)}
						aria-label={`${project.title} 프로젝트`}
						transition:fly|global={{ duration: 500, y: 100, delay: index * 100 }}
					>
						<div class="project-logo">
							<img 
								src={project.logoPath} 
								alt={`${project.title} 로고`}
								draggable="false"
								oncontextmenu={(e) => e.preventDefault()}
							/>
						</div>
						<div class="project-logo-reflection">
							<img 
								src={project.logoPath} 
								alt="" 
								aria-hidden="true"
								draggable="false"
								oncontextmenu={(e) => e.preventDefault()}
							/>
						</div>
					</button>
				{/each}
			</div>
		</div>
	</div>
</main>

<style>
	main {
		height: 100vh;
		overflow: visible;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text);
	}

	.content-wrapper {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: top;
		justify-content: center;
	}

	.header-section {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		text-align: center;
		z-index: 10;
		flex: 0.3;
	}

	.project-title {
		font-size: 2rem;
		font-weight: 300;
		margin: 0 0 1rem 0;
		letter-spacing: 0.05em;
	}

	.tags {
		display: flex;
		gap: 0.8rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.tag {
		font-size: 0.75rem;
		letter-spacing: 0.1em;
		color: var(--text-tertiary);
		font-weight: 300;
	}

	.carousel-container {
		width: 100%;
		overflow-x: auto;
		overflow-y: visible;
		cursor: grab;
		scrollbar-width: none;
		-ms-overflow-style: none;
		position: relative;
		flex: 0.7;
		display: flex;
		align-items:flex-start;
	}

	.carousel-container::-webkit-scrollbar {
		display: none;
	}

	.carousel-track {
		display: flex;
		gap: 3rem;
		padding: 10vh 50vw;
		align-items: center;
		overflow: visible;
	}

	.carousel-item {
		width: 22vh;
		height: 22vh;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
		opacity: 0.6;
		cursor: pointer;
		background: none;
		border: none;
		padding: 0;
		position: relative;
		overflow: visible;
	}

	.carousel-item.selected {
		opacity: 1;
	}

	.project-logo {
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.carousel-item.selected .project-logo {
		transform: scale(1.15);
	}

	.carousel-item.selected .project-logo-reflection {
		transform: scale(1.15);
	}

	.project-logo img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		border-radius: 32px;
		user-select: none;
		-webkit-user-drag: none;
		pointer-events: none;
	}

	.project-logo-reflection {
		width: 22vh;
		height: 22vh;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		overflow: visible;
		position: relative;
		margin-top: 2px;
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.project-logo-reflection img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		border-radius: 32px;
		transform: scaleY(-1);
		opacity: 0.6;
		mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.3) 0%, transparent 100%);
		-webkit-mask-image: linear-gradient(to bottom, rgba(0, 0, 0, 0.3) 0%, transparent 100%);
		user-select: none;
		-webkit-user-drag: none;
		pointer-events: none;
	}

	@media (max-width: 768px) {
		.project-title {
			font-size: 1.5rem;
		}

		.tag {
			font-size: 0.65rem;
		}

		.carousel-track {
			gap: 2rem;
		}
	}

	@media (max-width: 480px) {

		.project-title {
			font-size: 1.2rem;
		}

		.tag {
			font-size: 0.6rem;
		}
	}
</style>

