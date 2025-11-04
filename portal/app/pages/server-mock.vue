<template>
  <div class="server-header">
    <div class="server-name">
      Zeppelin Test Server 1
    </div>
    <div class="server-tools">
      <BasicTab class="tool" active>Overview</BasicTab>
      <BasicTab class="tool">Config</BasicTab>
      <BasicTab class="tool">Cases</BasicTab>
      <BasicTab class="tool">Access</BasicTab>
    </div>
  </div>
</template>

<script setup>
import DefaultH1 from '~/components/DefaultH1.vue'
import BasicButton from '~/components/BasicButton.vue'
import BasicTab from '~/components/BasicTab.vue';
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
.tool {
  border: none;
}

</style>
