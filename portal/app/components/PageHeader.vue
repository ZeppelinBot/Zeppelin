<script setup lang="ts">
import BasicTab from './BasicTab.vue';

</script>

<template>
  <div class="page-header">
    <div class="heading">
      <slot name="heading" />
    </div>
    <div class="tabs" role="tablist" aria-label="Page sections" v-if="$slots.tabs">
      <slot name="tabs" />
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 64px;
}
.heading :deep(h1) {
  margin: 0;
  font-size: var(--text-xl2);
  line-height: 64px;
  height: 64px;
  font-weight: 450;
}
.tabs {
  display: flex;
  gap: 32px;
  height: 64px;
  align-items: center;
}
</style>
