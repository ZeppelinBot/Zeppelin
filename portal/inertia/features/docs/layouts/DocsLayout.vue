<template>
  <MainLayout>
    <WithSidebar>
      <template #sidebar>
        <nav aria-label="Documentation menu">
          <SidebarMenu :categories="page.props.docsLayoutData.menu" :current-path="currentPath" />
        </nav>
      </template>
      <template #content>
        <slot />
      </template>
    </WithSidebar>
  </MainLayout>
</template>

<style scoped>
</style>

<script setup lang="ts">
import { DocsLayoutData } from '#backend/features/docs/utils/docsLayoutData';
import WithSidebar from '#frontend/features/layout/WithSidebar.vue';
import MainLayout from '#frontend/features/layout/MainLayout.vue';
import { usePage } from '@inertiajs/vue3';
import SidebarMenu from '#frontend/features/layout/SidebarMenu.vue';
import { useCurrentPath } from '#frontend/features/utils/useCurrentPath.js';

const page = usePage<{
  docsLayoutData: DocsLayoutData,
}>();
const currentPath = useCurrentPath();
</script>
