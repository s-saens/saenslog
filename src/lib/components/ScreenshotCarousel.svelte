<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		screenshots: string[];
		selectedIndex?: number;
	}

	let { screenshots, selectedIndex = $bindable(0) }: Props = $props();

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
			}
		}
	}

	// 관성 스크롤 애니메이션
	function applyMomentum() {
		if (!carouselRef) return;
		
		if (Math.abs(velocity) < 0.5) {
			velocity = 0;
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
		velocity *= 0.93;
		
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
		
		const currentTime = Date.now();
		const timeDelta = currentTime - lastTime;
		if (timeDelta > 0) {
			const xDelta = e.pageX - lastX;
			velocity = -(xDelta / timeDelta) * 16;
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
		
		const xDiff = Math.abs(x - startX);
		const yDiff = Math.abs(y - startY);
		
		if (xDiff > yDiff && xDiff > 10) {
			e.preventDefault();
		}
		
		const walk = (x - startX) * 1.2;
		const distance = Math.abs(walk);
		
		if (distance > 5) {
			hasDragged = true;
		}
		
		const currentTime = Date.now();
		const timeDelta = currentTime - lastTime;
		if (timeDelta > 0) {
			const xDelta = touch.pageX - lastX;
			velocity = -(xDelta / timeDelta) * 16;
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
		}
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
	aria-label="스크린샷 캐러셀"
	tabindex="0"
>
	<div class="carousel-track">
		{#each screenshots as screenshot, index (screenshot)}
			<div
				class="carousel-item"
				class:selected={index === selectedIndex}
			>
				<div class="screenshot-image">
					<img 
						src={screenshot} 
						alt={`스크린샷 ${index + 1}`}
						draggable="false"
						oncontextmenu={(e) => e.preventDefault()}
					/>
				</div>
			</div>
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
		display: flex;
		align-items: center;
		touch-action: pan-x;
		padding: 2rem 0;
	}

	.carousel-container::-webkit-scrollbar {
		display: none;
	}

	.carousel-track {
		display: flex;
		gap: 2rem;
		padding: 0 50vw;
		align-items: center;
		overflow: visible;
	}

	.carousel-item {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.4;
		transition: opacity 0.4s ease-in-out;
		position: relative;
		overflow: visible;
	}

	.carousel-item.selected {
		opacity: 1;
		transition: opacity 0.4s ease-in-out;
	}

	.screenshot-image {
		display: flex;
		align-items: center;
		justify-content: center;
		max-width: 60vw;
		max-height: 60vh;
	}

	.screenshot-image img {
		width: 100%;
		height: 100%;
		object-fit: contain;
		border-radius: 12px;
		border: 1px solid var(--border);
		user-select: none;
		-webkit-user-drag: none;
		pointer-events: none;
	}

	@media (max-width: 768px) {
		.carousel-track {
			gap: 1.5rem;
		}

		.screenshot-image {
			max-width: 80vw;
			max-height: 50vh;
		}
	}

	@media (max-width: 480px) {
		.carousel-track {
			gap: 1rem;
		}

		.screenshot-image {
			max-width: 90vw;
			max-height: 40vh;
		}
	}
</style>

