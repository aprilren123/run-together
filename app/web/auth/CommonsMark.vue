<script setup lang="ts">
/** Commons' logo, in Commons' colors: three blocks joined by two dots, and a fourth block lifting in. */
withDefaults(defineProps<{ size?: number }>(), { size: 24 });
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 64 64" aria-hidden="true">
    <rect width="64" height="64" rx="16" fill="#c45611" />
    <g fill="#fefcf4">
      <rect x="15" y="15" width="16" height="16" rx="4.5" />
      <rect x="15" y="33" width="16" height="16" rx="4.5" />
      <rect x="33" y="33" width="16" height="16" rx="4.5" />
      <circle cx="23" cy="32" r="2.7" />
      <circle cx="32" cy="41" r="2.7" />
    </g>
    <rect
      x="34"
      y="14"
      width="16"
      height="16"
      rx="4.5"
      fill="#000"
      opacity="0.28"
      transform="rotate(12 42 22)"
    />
    <rect
      x="36"
      y="12"
      width="16"
      height="16"
      rx="4.5"
      fill="#fefcf4"
      transform="rotate(12 44 20)"
    />
  </svg>
</template>
