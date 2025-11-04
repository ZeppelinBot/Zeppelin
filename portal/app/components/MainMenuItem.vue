<template>
  <NuxtLink :to="props.to" class="main-menu-item" :class="{ active: props.active }" :aria-current="props.active" role="menuitem">
    <div class="content"><slot /></div>
    <Squiggle class="squiggle" />
  </NuxtLink>
</template>

<style scoped>
.main-menu-item {
  color: inherit;
  text-decoration: none;
}
.main-menu-item:visited {
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
import { NuxtLink } from '#components';
import Squiggle from './Squiggle.vue';

const props = defineProps({
  to: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    default: false,
  },
});
</script>
