<template>
  <MainLayout :max-width-step="20">
    <ContentPaper>
      <div class="privacy-policy-wrapper" v-html="privacyPolicyHtml"></div>
    </ContentPaper>
  </MainLayout>
</template>

<style scoped>
.privacy-policy-wrapper :deep(p) {
  margin-bottom: 24px;
}
.privacy-policy-wrapper :deep(table) {
  width: 100%;
  margin-bottom: 24px;
}
.privacy-policy-wrapper :deep(th) {
  text-align: left;
}
.privacy-policy-wrapper :deep(td) {
  padding: 2px;
}
</style>

<script setup lang="ts">
import ContentPaper from "#frontend/features/layout/ContentPaper.vue";
import MainLayout from "#frontend/features/layout/MainLayout.vue";
import MarkdownIt from "markdown-it";
import { computed } from "vue";

const props = defineProps({
  privacyPolicyMd: {
    type: String,
    required: true,
  },
});

const md = new MarkdownIt({
  html: false,
  linkify: true,
});
// Add underline support
md.renderer.rules.strong_open = (tokens, idx) => (tokens[idx].markup === "__" ? "<u>" : "<strong>");
md.renderer.rules.strong_close = (tokens, idx) => (tokens[idx].markup === "__" ? "</u>" : "</strong>");

const privacyPolicyHtml = computed(() => md.render(props.privacyPolicyMd));
</script>
