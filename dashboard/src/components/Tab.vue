<template>
  <li style="padding-bottom: 1px" :class="{active: active}">
    <slot></slot>
  </li>
</template>

<style scoped>
  li {
    padding-bottom: 1px;

    &.active {
      padding-bottom: 0;
      @apply border-b;
      @apply border-gray-400;
    }
  }

  a {
    @apply block;
    @apply py-2;
    @apply px-4;
    @apply text-gray-500;

    &:hover {
      @apply text-gray-200;
    }
  }

  .active a {
    @apply text-gray-200;
  }
</style>

<script lang="ts">
  export default {
    props: ["active"],
  };
</script>
