<script lang="ts">
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';

	interface Project {
		id: string;
		title: string;
		tags: string[];
		startDate: string;
		endDate: string;
		logoPath: string;
	}

	interface Props {
		projects: Project[];
		selectedIndex: number;
		onSelect: (index: number) => void;
		onClick: (index: number) => void;
	}

	let { projects, selectedIndex = $bindable(), onSelect, onClick }: Props = $props();

	let carouselRef: HTMLDivElement;
	let isDragging = $state(false);
	let startX = $state(0);
	let startY = $state(0);
	let scrollLeft = $state(0);
	let hasDragged = $state(false);
	let currentScrollLeft = $state(0);
	let velocity = $state(0);
	let lastX = $state(0);
	let lastTime = $state(0);
	let animationFrame: number;
	let wheelTimeout: number;

	// Carousel 좌표 기준으로 각 아이템의 scale 계산
	function getScaleForIndex(index: number): number {
		const scrollPos = currentScrollLeft;
		
		if (!carouselRef) return 1;
		
		const carousel = carouselRef;
		const items = carousel.querySelectorAll('.carousel-item');
		if (!items[index]) return 1;
		
		const item = items[index] as HTMLElement;
		const carouselCenter = scrollPos + carousel.offsetWidth / 2;
		const itemCenter = item.offsetLeft + item.offsetWidth / 2;
		const distance = Math.abs(carouselCenter - itemCenter);
		
		const normalizedDistance = distance / (carousel.offsetWidth / 2);
		const scale = Math.max(0.2, 1.2 - normalizedDistance * 0.5);
		
		return scale;
	}

	// 선택된 인덱스에 따라 스크롤 위치 조정
	$effect(() => {
		if (carouselRef && !isDragging) {
			const carousel = carouselRef;
			const items = carousel.querySelectorAll('.carousel-item');
			if (items[selectedIndex]) {
				const item = items[selectedIndex] as HTMLElement;
				const itemLeft = item.offsetLeft;
				const itemWidth = item.offsetWidth;
				const carouselWidth = carousel.offsetWidth;
				const scrollPosition = itemLeft - (carouselWidth / 2) + (itemWidth / 2);
				carousel.scrollTo({ left: scrollPosition, behavior: 'smooth' });
				
				const updateScroll = () => {
					currentScrollLeft = carousel.scrollLeft;
					if (Math.abs(carousel.scrollLeft - scrollPosition) > 1) {
						requestAnimationFrame(updateScroll);
					}
				};
				requestAnimationFrame(updateScroll);
			}
		}
	});

	// 가장 가까운 아이템으로 스냅
	function snapToNearestItem() {
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

		// 가장 가까운 아이템으로 부드럽게 이동
		if (items[closestIndex]) {
			const item = items[closestIndex] as HTMLElement;
			const itemLeft = item.offsetLeft;
			const itemWidth = item.offsetWidth;
			const carouselWidth = carousel.offsetWidth;
			const scrollPosition = itemLeft - (carouselWidth / 2) + (itemWidth / 2);
			
			// 스크롤 범위 제한 (첫/마지막 아이템)
			const maxScroll = carousel.scrollWidth - carousel.offsetWidth;
			const clampedPosition = Math.max(0, Math.min(scrollPosition, maxScroll));
			
			carousel.scrollTo({ left: clampedPosition, behavior: 'smooth' });
			
			if (selectedIndex !== closestIndex) {
				selectedIndex = closestIndex;
				onSelect(closestIndex);
			}
		}
	}

	// 관성 스크롤 애니메이션
	function applyMomentum() {
		if (!carouselRef) return;
		
		if (Math.abs(velocity) < 0.5) {
			velocity = 0;
			// 관성이 끝나면 가장 가까운 아이템으로 스냅
			snapToNearestItem();
			return;
		}
		
		const newScrollLeft = carouselRef.scrollLeft + velocity;
		const maxScroll = carouselRef.scrollWidth - carouselRef.offsetWidth;
		
		// 경계 체크
		if (newScrollLeft < 0 || newScrollLeft > maxScroll) {
			velocity = 0;
			snapToNearestItem();
			return;
		}
		
		carouselRef.scrollLeft = newScrollLeft;
		currentScrollLeft = carouselRef.scrollLeft;
		velocity *= 0.93; // 감쇠
		
		updateSelectedIndexFromScroll();
		animationFrame = requestAnimationFrame(applyMomentum);
	}

	function handleMouseDown(e: MouseEvent) {
		if (!carouselRef) return;
		isDragging = true;
		hasDragged = false;
		velocity = 0;
		if (animationFrame) cancelAnimationFrame(animationFrame);
		
		startX = e.pageX - carouselRef.offsetLeft;
		scrollLeft = carouselRef.scrollLeft;
		lastX = e.pageX;
		lastTime = Date.now();
		carouselRef.style.cursor = 'grabbing';
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging || !carouselRef) return;
		e.preventDefault();
		
		const x = e.pageX - carouselRef.offsetLeft;
		const walk = (x - startX) * 1.5;
		const distance = Math.abs(walk);
		
		if (distance > 5) {
			hasDragged = true;
		}
		
		// 속도 계산 (방향 반대로)
		const currentTime = Date.now();
		const timeDelta = currentTime - lastTime;
		if (timeDelta > 0) {
			const xDelta = e.pageX - lastX;
			velocity = -(xDelta / timeDelta) * 16; // 60fps 기준, 방향 반대
		}
		
		lastX = e.pageX;
		lastTime = currentTime;
		
		carouselRef.scrollLeft = scrollLeft - walk;
		currentScrollLeft = carouselRef.scrollLeft;
		updateSelectedIndexFromScroll();
	}

	function handleMouseUp() {
		if (!carouselRef) return;
		isDragging = false;
		carouselRef.style.cursor = 'grab';
		currentScrollLeft = carouselRef.scrollLeft;
		updateSelectedIndexFromScroll();
		
		// 관성 스크롤 시작 (임계값 이상) 또는 가장 가까운 아이템으로 스냅
		if (Math.abs(velocity) > 1) {
			applyMomentum();
		} else {
			snapToNearestItem();
		}
		
		setTimeout(() => {
			hasDragged = false;
		}, 100);
	}

	function handleTouchStart(e: TouchEvent) {
		if (!carouselRef) return;
		isDragging = true;
		hasDragged = false;
		velocity = 0;
		if (animationFrame) cancelAnimationFrame(animationFrame);
		
		const touch = e.touches[0];
		startX = touch.pageX - carouselRef.offsetLeft;
		startY = touch.pageY;
		scrollLeft = carouselRef.scrollLeft;
		lastX = touch.pageX;
		lastTime = Date.now();
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isDragging || !carouselRef) return;
		
		const touch = e.touches[0];
		const x = touch.pageX - carouselRef.offsetLeft;
		const y = touch.pageY;
		
		// 수평 스크롤인지 확인
		const xDiff = Math.abs(x - startX);
		const yDiff = Math.abs(y - startY);
		
		// 수평 이동이 더 크면 수직 스크롤 방지
		if (xDiff > yDiff && xDiff > 10) {
			e.preventDefault();
		}
		
		const walk = (x - startX) * 1.2; // 터치는 더 민감하게
		const distance = Math.abs(walk);
		
		if (distance > 5) {
			hasDragged = true;
		}
		
		// 속도 계산 (방향 반대로)
		const currentTime = Date.now();
		const timeDelta = currentTime - lastTime;
		if (timeDelta > 0) {
			const xDelta = touch.pageX - lastX;
			velocity = -(xDelta / timeDelta) * 16; // 방향 반대
		}
		
		lastX = touch.pageX;
		lastTime = currentTime;
		
		carouselRef.scrollLeft = scrollLeft - walk;
		currentScrollLeft = carouselRef.scrollLeft;
		updateSelectedIndexFromScroll();
	}

	function handleTouchEnd() {
		if (carouselRef) {
			currentScrollLeft = carouselRef.scrollLeft;
		}
		isDragging = false;
		updateSelectedIndexFromScroll();
		
		// 관성 스크롤 시작 (임계값 이상) 또는 가장 가까운 아이템으로 스냅
		if (Math.abs(velocity) > 1) {
			applyMomentum();
		} else {
			snapToNearestItem();
		}
		
		setTimeout(() => {
			hasDragged = false;
		}, 100);
	}

	function handleWheel(e: WheelEvent) {
		if (!carouselRef) return;
		if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
			e.preventDefault();
			carouselRef.scrollLeft += e.deltaX || e.deltaY;
			currentScrollLeft = carouselRef.scrollLeft;
			updateSelectedIndexFromScroll();
			
			// 휠 스크롤이 멈춘 후 스냅
			if (wheelTimeout) clearTimeout(wheelTimeout);
			wheelTimeout = setTimeout(() => {
				snapToNearestItem();
			}, 150) as unknown as number;
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

		if (selectedIndex !== closestIndex) {
			selectedIndex = closestIndex;
			onSelect(closestIndex);
		}
	}

	function handleProjectClick(index: number) {
		if (hasDragged) {
			return;
		}
		onClick(index);
	}

	onMount(() => {
		if (carouselRef) {
			setTimeout(() => {
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
							currentScrollLeft = scrollPosition;
						}
					}
				});
			}, 100);
		}

		// cleanup
		return () => {
			if (animationFrame) {
				cancelAnimationFrame(animationFrame);
			}
			if (wheelTimeout) {
				clearTimeout(wheelTimeout);
			}
		};
	});
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
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
	aria-label="프로젝트 캐러셀"
	tabindex="0"
>
	<div class="carousel-track">
		{#each projects as project, index}
			{@const scale = getScaleForIndex(index)}
			<button
				class="carousel-item"
				class:selected={index === selectedIndex}
				style="--item-scale: {scale}"
				onclick={() => handleProjectClick(index)}
				aria-label={`${project.title} 프로젝트`}
				transition:fly|global={{ duration: 500, y: 100, delay: 200 + index * 100 }}
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

<style>
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
		align-items: flex-start;
		touch-action: pan-x; /* 수평 터치만 허용 */
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
		width: 28vh;
		height: 28vh;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		opacity: 0.4;
		transition: opacity 0.4s ease-in-out;
		cursor: pointer;
		background: none;
		border: none;
		padding: 0;
		position: relative;
		overflow: visible;
	}

	.carousel-item.selected {
		opacity: 1;
		transition: opacity 0.4s ease-in-out;
	}

	.project-logo {
		display: flex;
		align-items: center;
		justify-content: center;
		transform: scale(var(--item-scale, 1));
		transition: transform 0.2s ease-out;
	}

	.project-logo-reflection {
		width: 28vh;
		height: 28vh;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		overflow: visible;
		position: relative;
		margin-top: 2px;
		transform: scale(var(--item-scale, 1));
		transition: transform 0.2s ease-out;
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
		.carousel-item {
			width: 24vh;
			height: 24vh;
		}

		.project-logo-reflection {
			width: 24vh;
			height: 24vh;
		}

		.carousel-track {
			gap: 1rem;
		}
	}

	@media (max-width: 480px) {
		.carousel-item {
			width: 20vh;
			height: 20vh;
		}

		.project-logo-reflection {
			width: 20vh;
			height: 20vh;
		}
	}
</style>

