<template>
  <PageHeader>
    <template #heading>
      <h1>Dashboard</h1>
    </template>
    <template #tabs>
      <BasicTab active>My servers</BasicTab>
      <BasicTab>Profile</BasicTab>
    </template>
  </PageHeader>
  <NuxtPage />
</template>

<script setup>
import { NuxtPage } from '#components';
import BasicTab from '~/components/BasicTab.vue';
import PageHeader from '~/components/PageHeader.vue';
</script>

<style scoped>
.server-header {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.server-name {
  font-size: var(--text-xl2);
  line-height: 64px;
  height: 64px;
  font-weight: 450;
}
.server-tools {
  display: flex;
  gap: 32px;
  height: 64px;
  align-items: center;
}
</style>
