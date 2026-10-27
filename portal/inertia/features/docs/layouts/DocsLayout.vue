<template>
  <MainLayout>
    <WithSidebar>
      <template #sidebar>
        <nav>
          <SidebarMenu :categories="page.props.docsLayoutData.menu" :current-path="path" />
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
import { computed } from 'vue';
import { Link } from '@adonisjs/inertia/vue';
import Squiggle from '#frontend/components/Squiggle.vue';
import SidebarMenu from '#frontend/features/layout/SidebarMenu.vue';

const page = usePage<{
  docsLayoutData: DocsLayoutData,
}>();

const path = computed(() => page.url.split("?")[0].replace(/\/$/, ""));
</script>
