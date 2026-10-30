<template>
  <div class="main-menu-item" :class="{ active: props.active }" :aria-current="props.active" role="menuitem">
    <div class="link"><slot /></div>
  </div>
</template>

<style scoped>
.link > :deep(*) {
  color: inherit;
  text-decoration: none;
}
.link > :deep(*:visited) {
  color: inherit;
}
.link :deep(.squiggle) {
  visibility: hidden;
}
.active :deep(.squiggle) {
  visibility: visible;
}
</style>

<script setup lang="ts">
const props = defineProps({
  active: {
    type: Boolean,
    default: false,
  },
});
</script>
