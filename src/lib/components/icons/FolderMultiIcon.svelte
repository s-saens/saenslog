<script lang="ts">
  let { 
    color = 'var(--text)', 
    width = 14, 
    height = 14,
    class: className = ''
  }: { 
    color?: string; 
    width?: number; 
    height?: number; 
    class?: string;
  } = $props();
</script>

<svg {width} {height} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" class={className}>
  <g clip-path="url(#clip0_57_1215)">
    <path d="M3 7.375V3.375C3 3.16789 3.13431 3 3.3 3H6.38903C6.46064 3 6.52988 3.03203 6.58426 3.09028L8.16575 4.78472C8.2201 4.84297 8.28935 4.875 8.361 4.875H12.7C12.8657 4.875 13 5.04289 13 5.25V7.375M3 7.375V12.625C3 12.8321 3.13431 13 3.3 13H12.7C12.8657 13 13 12.8321 13 12.625V7.375M3 7.375H13" stroke={color} stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M3 11H1V1H7L9 3H11V4.84211" stroke={color} stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  <defs>
    <clipPath id="clip0_57_1215">
      <rect width="14" height="14" fill="white"/>
    </clipPath>
  </defs>
</svg>

