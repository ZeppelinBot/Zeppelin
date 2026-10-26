<template>
  <MainLayout :max-width-step="5">
    <ContentPaper>
      <div class="splash-content">
        <h1>Zeppelin</h1>
        <div class="blurb">
          Zeppelin is a private moderation bot for Discord, designed with large servers and reliability in mind.
        </div>
        <div class="actions">
          <div class="action">
            <BasicButton class="action-btn">Dashboard</BasicButton>
          </div>
          <div class="action">
            <BasicButton class="action-btn">Documentation</BasicButton>
          </div>
        </div>
      </div>
    </ContentPaper>
  </MainLayout>
</template>

<style scoped>
.splash-content {
  text-align: center;
  padding-top: 32px;
}
h1 {
  font-size: 90px;
  line-height: 128px;
  border: none;
  margin: 0;
  font-weight: 600;
}
.blurb {
  margin-top: 16px;
  line-height: 16px;
}

.actions {
  margin-top: 64px;
  display: flex;
  gap: 64px;
  justify-content: center;
}
.action {
  flex: 0 0 auto;
}
.action-btn {
  font-size: 20px;
}
</style>

<script setup lang="ts">
import BasicButton from "#frontend/components/BasicButton.vue";
import ContentPaper from "#frontend/components/ContentPaper.vue";
import MainLayout from "#frontend/layouts/MainLayout.vue";
</script>
