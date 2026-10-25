<script setup lang="ts">
import FlashToasts from '#frontend/features/toasts/FlashToasts.vue';
</script>

<template>
  <div class="app-main">
    <slot />
  </div>
  <FlashToasts />
</template>
