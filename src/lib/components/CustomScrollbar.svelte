<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	
	let scrollbarContainer = $state<HTMLDivElement | null>(null);
	let scrollThumb = $state<HTMLDivElement | null>(null);
	let isDragging = $state(false);
	let scrollPercentage = $state(0);
	let thumbHeight = $state(0);
	let isScrollable = $state(false); // 스크롤 가능 여부 (상위 개념)
	let isVisible = $state(false); // 스크롤바 표시 여부
	
	let dragStartY = 0;
	let dragStartScrollTop = 0;
	let hideTimeout: number | null = null;
	let initTimeout: number | null = null;
	let isHoveringScrollbar = $state(false);

    function setScrollbarWidth(width: number) {
        if (scrollbarContainer) {
            scrollbarContainer.style.width = `${width}px`;
        }
    }

    function init() {

        // 이전 이벤트 리스너 정리
        if (scrollableElement) {
            scrollableElement.removeEventListener('scroll', handleScroll);
        }
        window.removeEventListener('resize', updateScrollbar);
        window.removeEventListener('mousemove', handleGlobalMouseMove);

        if (initTimeout) {
            window.clearTimeout(initTimeout);
        }

        if (hideTimeout) {
            window.clearTimeout(hideTimeout);
        }

        isVisible = false;
        isScrollable = false;

        initTimeout = window.setTimeout(() => {

            const all = document.querySelectorAll('.site-main > .scrollable > *');

            scrollableElement = all[all.length - 1] as HTMLElement;

            if (scrollableElement) {
                scrollableElement.addEventListener('scroll', handleScroll);
            }
            
            // 초기 스크롤바 상태 업데이트
            updateScrollbar();
            // 윈도우 리사이즈 시 업데이트
            window.addEventListener('resize', updateScrollbar);
            // 전역 마우스 이동 이벤트
            window.addEventListener('mousemove', handleGlobalMouseMove);
        }, 500);
    }

    let scrollableElement = $state<HTMLElement | null>(null);
	
	onMount(init);
    afterNavigate(init);
	
	
	// 스크롤바 높이 계산
	function updateScrollbar() {
		if (!scrollableElement) return;
		
		const scrollHeight = scrollableElement.scrollHeight;
		const clientHeight = scrollableElement.clientHeight;
		
		// 스크롤 가능 여부 체크
		if (scrollHeight <= clientHeight) {
			isScrollable = false;
			isVisible = false;
			return;
		}
		
		isScrollable = true;
        isVisible = true;
		
		// thumb 높이 계산 (최소 30px)
		const ratio = clientHeight / scrollHeight;
		thumbHeight = Math.max(30, ratio * clientHeight);
		
		// 현재 스크롤 위치 계산
		const scrollTop = scrollableElement.scrollTop;
		const maxScroll = scrollHeight - clientHeight;
		scrollPercentage = scrollTop / maxScroll;
	}
	
	// 스크롤 이벤트 핸들러
	function handleScroll() {
		updateScrollbar();
		showScrollbar();
	}
	
	// 스크롤바 보이기
	function showScrollbar(time: number = 1000) {
        console.log('showScrollbar', isScrollable);

		if (!isScrollable) {
            isVisible = false;
            return;
        }
		
		isVisible = true;
		
        if (initTimeout) {
            window.clearTimeout(initTimeout);
        }
        
		if (hideTimeout) {
			window.clearTimeout(hideTimeout);
		}
		
		if (!isDragging) {
			hideTimeout = window.setTimeout(() => {
				isVisible = false;
			}, time);
		}
	}
	
	// 마우스가 스크롤바 영역에 진입
	function handleMouseEnter() {
		if (!isScrollable) return; // 스크롤 불가능하면 아예 보이지 않음
		
		isHoveringScrollbar = true;
		isVisible = true;
		if (hideTimeout) {
			clearTimeout(hideTimeout);
			hideTimeout = null;
		}
	}
	
	// 마우스가 스크롤바 영역을 벗어남
	function handleMouseLeave() {
		isHoveringScrollbar = false;
		if (!isDragging) {
			showScrollbar(); // 3초 후 숨김
		}
	}
	
	// 마우스 다운 - 드래그 시작
	function handleMouseDown(e: MouseEvent) {
		e.preventDefault();
		isDragging = true;
		dragStartY = e.clientY;
		
		if (scrollableElement) {
			dragStartScrollTop = scrollableElement.scrollTop;
		}
		
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}
	
	// 마우스 이동 - 드래그 중
	function handleMouseMove(e: MouseEvent) {
		if (!isDragging) return;
		
		if (!scrollableElement || !scrollbarContainer) return;
		
		const deltaY = e.clientY - dragStartY;
		const containerHeight = scrollbarContainer.clientHeight;
		const scrollHeight = scrollableElement.scrollHeight;
		const clientHeight = scrollableElement.clientHeight;
		const maxScroll = scrollHeight - clientHeight;
		
		// 이동 거리를 스크롤 거리로 변환
		const scrollRatio = maxScroll / (containerHeight - thumbHeight);
		const newScrollTop = dragStartScrollTop + (deltaY * scrollRatio);
		
		scrollableElement.scrollTop = Math.max(0, Math.min(maxScroll, newScrollTop));
	}
	
	// 마우스 업 - 드래그 종료
	function handleMouseUp() {
		isDragging = false;
		document.removeEventListener('mousemove', handleMouseMove);
		document.removeEventListener('mouseup', handleMouseUp);
		showScrollbar(); // 드래그 후 3초 유지
	}
	
	// 스크롤바 트랙 클릭
	function handleTrackClick(e: MouseEvent) {
		if (!scrollbarContainer || e.target !== scrollbarContainer) return;
		
		if (!scrollableElement) return;
		
		const rect = scrollbarContainer.getBoundingClientRect();
		const clickY = e.clientY - rect.top;
		const containerHeight = rect.height;
		
		const scrollHeight = scrollableElement.scrollHeight;
		const clientHeight = scrollableElement.clientHeight;
		const maxScroll = scrollHeight - clientHeight;
		
		// 클릭 위치를 스크롤 위치로 변환 (thumb 중앙으로 이동)
		const targetPercentage = (clickY - thumbHeight / 2) / (containerHeight - thumbHeight);
		const targetScroll = targetPercentage * maxScroll;
		
		scrollableElement.scrollTo({
			top: Math.max(0, Math.min(maxScroll, targetScroll)),
			behavior: 'smooth'
		});
	}
	
	// 마우스 위치 추적
	function handleGlobalMouseMove(e: MouseEvent) {
		if (!isScrollable) return; // 스크롤 불가능하면 아예 보이지 않음
		
		const distanceFromRight = window.innerWidth - e.clientX;
		
		// 오른쪽 30px 이내에 마우스가 있으면 스크롤바 표시
		if (distanceFromRight <= 30) {
			isVisible = true;
			if (hideTimeout) {
				clearTimeout(hideTimeout);
				hideTimeout = null;
			}
		}
	}

	// thumb의 top 위치 계산
	$effect(() => {
		if (scrollbarContainer && scrollThumb) {
			const containerHeight = scrollbarContainer.clientHeight;
			const maxThumbTop = containerHeight - thumbHeight;
			const thumbTop = scrollPercentage * maxThumbTop;
			
			scrollThumb.style.transform = `translateY(${thumbTop}px)`;
		}
	});
</script>

{#if isScrollable}
<div 
    transition:fly|global={{ x: 16, duration: 300 }}
	class="custom-scrollbar" 
	class:visible={isVisible}
	bind:this={scrollbarContainer}
	onclick={handleTrackClick}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			handleTrackClick(e as unknown as MouseEvent);
		}
	}}
	onmouseenter={handleMouseEnter}
	onmouseleave={handleMouseLeave}
	role="scrollbar"
	aria-controls="main-content"
	aria-valuenow={Math.round(scrollPercentage * 100)}
	aria-valuemin="0"
	aria-valuemax="100"
	aria-orientation="vertical"
	tabindex="-1"
>
	<div 
		class="scrollbar-thumb" 
		class:dragging={isDragging}
		bind:this={scrollThumb}
		style="height: {thumbHeight}px"
		onmousedown={handleMouseDown}
		role="button"
		tabindex="0"
		aria-label="스크롤 핸들"
	></div>
</div>
{/if}

<style>
	.custom-scrollbar {
		position: fixed;
		top: 0;
		right: 0;
		width: 16px;
		height: 100vh;
		z-index: 200;
		opacity: 0;
		transition: opacity 0.3s ease;
		pointer-events: none;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.custom-scrollbar.visible {
		opacity: 1;
		pointer-events: auto;
	}
	
	.scrollbar-thumb {
		position: absolute;
		top: 0;
		width: 12px;
        opacity: 0.6;
		background: linear-gradient(
			to bottom,
			var(--text-tertiary) 0%,
            var(--text-secondary) 100%
		);
		border-radius: 18px;
		cursor: pointer;
		transition: background 0.2s ease,
                    width 0.2s ease,
                    right 0.2s ease,
                    height 0.2s ease;
		will-change: transform;
	}
	
	.custom-scrollbar:hover .scrollbar-thumb {
		width: 16px;
        opacity: 1;
        transition: opacity 0.2s ease,
                    width 0.2s ease;
	}
	
	.scrollbar-thumb.dragging {
		width: 16px;
	}
</style>

