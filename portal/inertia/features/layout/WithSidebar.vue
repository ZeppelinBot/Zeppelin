<template>
  <div class="sidebar-mobile-trigger">
    <BasicButton theme="menu" role="button" :aria-controls="sidebarId" :aria-expanded="sidebarExpanded" @click="sidebarExpanded = !sidebarExpanded">
      <slot name="mobile-trigger">Toggle sidebar</slot>
    </BasicButton>
  </div>
  <div class="with-sidebar">
    <div :id="sidebarId" class="sidebar-wrap" :class="{ expanded: sidebarExpanded }">
      <slot name="sidebar"></slot>
    </div>
    <div class="content-wrap">
      <slot name="content"></slot>
    </div>
  </div>
</template>

<style scoped>
.sidebar-mobile-trigger {
  margin-bottom: 48px;
  display: flex;
  justify-content: center;
}
.with-sidebar {
  display: flex;
  flex-direction: column;
  gap: 48px;
}
.sidebar-wrap {
  display: none;
  flex: 0 0 calc(96px * 2.5);
}
.sidebar-wrap.expanded {
  display: block;
}
.content-wrap {
  flex: 1 1 100%;
}

@media (min-width: 1056px) {
  .sidebar-mobile-trigger {
    display: none;
  }
  .with-sidebar {
    flex-direction: row;
    align-items: flex-start;
    gap: 24px;
  }
  .sidebar-wrap {
    display: block;
    flex: 0 0 calc(96px * 2.5);
  }
  .content-wrap {
    flex: 1 1 100%;
  }
}
</style>

<script setup lang="ts">
import BasicButton from '#frontend/components/BasicButton.vue';
import { ref } from 'vue';

const sidebarId = ref(`sidebar-${Math.ceil(Math.random() * 10_000_000 + 1_000_000)}`);
const sidebarExpanded = ref(false);
</script>
