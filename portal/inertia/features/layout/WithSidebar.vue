<template>
  <div class="with-sidebar">
    <div class="sidebar-wrap">
      <slot name="sidebar"></slot>
    </div>
    <div class="content-wrap">
      <slot name="content"></slot>
    </div>
  </div>
</template>

<style scoped>
.with-sidebar {
  display: flex;
  align-items: flex-start;
  gap: 24px;
}
.sidebar-wrap {
  flex: 0 0 calc(96px * 2.5);
}
.content-wrap {
  flex: 1 1 100%;
}
</style>
