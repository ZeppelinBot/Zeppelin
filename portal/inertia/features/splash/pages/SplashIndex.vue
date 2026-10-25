<template>
  Why hello there! The example string: {{ props.example }}
</template>

<script setup lang="ts">
const props = defineProps({
  example: {
    type: String,
    required: true,
  },
});
</script>
