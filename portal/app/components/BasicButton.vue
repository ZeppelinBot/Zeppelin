<template>
  <button>
    <div aria-hidden="true" class="corner corner1"></div>
    <div aria-hidden="true" class="corner corner2"></div>
    <div aria-hidden="true" class="corner corner3"></div>
    <div aria-hidden="true" class="corner corner4"></div>
    <slot />
  </button>
</template>

<script setup lang="ts">

</script>

<style scoped>
button {
  --bg-color: rgba(255, 255, 255, 0.05);
  --stripe-color: rgba(255, 255, 255, 0.05);

  display: inline-block;
  font: inherit;
  display: block;
  appearance: none;
  color: currentColor;
  border: 1.5px dashed var(--color-gray-100);
  border-radius: 8px;
  font-weight: 400;
  cursor: pointer;

  height: 32px;
  padding: 0 16px;

  background-color: var(--bg-color);
  background-image: repeating-linear-gradient(135deg, var(--stripe-color) 0px, var(--stripe-color) 2px, transparent 2px, transparent 6px);
  position: relative;
}
button:hover {
  --bg-color: rgba(255, 255, 255, 0.1);
  --stripe-color: rgba(255, 255, 255, 0.1);
}
</style>
