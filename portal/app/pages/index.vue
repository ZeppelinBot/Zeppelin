<template>
  <div class="splash">
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
</template>

<script setup lang="ts">
import BasicButton from '~/components/BasicButton.vue';
</script>

<style scoped>
.splash {
  text-align: center;
  margin-top: 32px;
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
  width: 192px;
  height: 64px;
  font-size: 20px;
  font-weight: 400;
}
</style>
