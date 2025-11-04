<template>
  <a class="basic-tab" role="menuitem" :aria-current="props.active" :class="{ active: props.active }">
    <slot />
  </a>
</template>

<script setup lang="ts">
const props = defineProps({
  active: {
    type: Boolean,
    default: false,
  },
});
</script>

<style scoped>
.basic-tab {
  --bg-color: rgba(255, 255, 255, 0.05);
  --stripe-color: rgba(255, 255, 255, 0.05);

  display: flex;
  align-items: center;
  justify-content: center;

  font: inherit;
  appearance: none;
  color: currentColor;
  border-radius: 8px;
  font-weight: 400;
  cursor: pointer;

  height: 32px;
  padding: 0 16px;

  background-color: var(--bg-color);
  background-image: repeating-linear-gradient(135deg, var(--stripe-color) 0px, var(--stripe-color) 2px, transparent 2px, transparent 6px);
  position: relative;
}
.basic-tab:hover {
  --bg-color: rgba(255, 255, 255, 0.1);
  --stripe-color: rgba(255, 255, 255, 0.1);
}
.active {
  border: 1.5px solid var(--color-gray-100);
}
</style>
