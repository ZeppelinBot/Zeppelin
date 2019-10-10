<template>
  <li class="py-2 px-4 hover:text-gray-200" :class="{'pb-1 border-b border-gray-400 text-gray-200': active, 'text-gray-500': !active}">
    <slot></slot>
  </li>
</template>

<script lang="ts">
  export default {
    props: ["active"],
  };
</script>
