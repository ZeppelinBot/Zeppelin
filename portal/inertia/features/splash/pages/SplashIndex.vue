<template>
  <MainLayout :max-width-step="20">
    <ContentPaper>
      <div class="splash-content">
        <h1>Zeppelin</h1>
        <div class="blurb">
          Zeppelin is a private moderation bot for Discord, designed with large servers and reliability in mind.
        </div>
        <div class="actions">
          <div class="action">
            <BasicButton>
              <a class="action-btn" href="https://zeppelin.gg/dashboard">Dashboard</a>
            </BasicButton>
          </div>
          <div class="action">
            <BasicButton>
              <a class="action-btn" href="https://zeppelin.gg/docs">Documentation</a>
            </BasicButton>
          </div>
        </div>
      </div>
    </ContentPaper>
  </MainLayout>
</template>

<style scoped>
.splash-content {
  text-align: center;
}
.splash-content h1 {
  font-size: 48px;
  line-height: 128px;
}
.blurb {
  margin-top: 16px;
  line-height: 16px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 48px;
  align-items: center;
}
.action {
  flex: 0 0 auto;
}
.action-btn {
  font-size: 20px;
}

@media (min-width: 960px) {
  .splash-content {
    padding-top: 32px;
  }
  .splash-content h1 {
    font-size: 90px;
    line-height: 128px;
  }
  .actions {
    flex-direction: row;
    margin-top: 72px;
    display: flex;
    gap: 72px;
    justify-content: center;
  }
}
</style>

<script setup lang="ts">
import BasicButton from "#frontend/components/BasicButton.vue";
import ContentPaper from "#frontend/features/layout/ContentPaper.vue";
import MainLayout from "#frontend/features/layout/MainLayout.vue";
import { Link } from "@adonisjs/inertia/vue";
</script>
