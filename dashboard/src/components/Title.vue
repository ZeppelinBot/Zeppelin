<template></template>

<script lang="ts">
  export default {
    props: ['title'],
    watch: {
      title: {
        immediate: true,
        handler() {
          document.title = this.title;
        },
      },
    },
  };
</script>
