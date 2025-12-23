<script lang="ts">
  let { 
    color = 'var(--text)',
    fillColor,
    width = 24, 
    height = 24,
    class: className = ''
  }: { 
    color?: string;
    fillColor?: string;
    width?: number; 
    height?: number; 
    class?: string;
  } = $props();
  
  // fillColor가 지정되지 않으면 color 사용
  const fill = fillColor || color;
</script>

<svg {width} {height} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class={className}>
  <path d="M22.5 14.3463C22.5 11.9727 19.8333 11.3793 18.5 11.3793C18.5 4.73333 13.8333 5.04981 11.5 6.03879V18.5H19.5C22 18.5 22.5 17.3132 22.5 14.3463Z" fill={fill}/>
  <path d="M9 7.22557V18.5M6.5 18.5V9.00574M4 18.5V12.5661M1.5 17.9066V14.3463M18.5 11.3793C19.8333 11.3793 22.5 11.9727 22.5 14.3463C22.5 17.3132 22 18.5 19.5 18.5C17.5 18.5 13.3333 18.5 11.5 18.5V6.03879C13.8333 5.04981 18.5 4.73333 18.5 11.3793Z" stroke={color} stroke-linecap="round" stroke-linejoin="round"/>
</svg>

