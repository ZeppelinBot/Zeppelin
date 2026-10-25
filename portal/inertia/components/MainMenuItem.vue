<template>
  <div class="main-menu-item" :class="{ active: props.active }" :aria-current="props.active" role="menuitem">
    <div class="link"><slot /></div>
    <Squiggle class="squiggle" />
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
.squiggle {
  width: 100%;
  height: 4px;
  visibility: hidden;
}
.active .squiggle {
  visibility: visible;
}
</style>

<script setup lang="ts">
import Squiggle from "./Squiggle.vue";

const props = defineProps({
  active: {
    type: Boolean,
    default: false,
  },
});
</script>
