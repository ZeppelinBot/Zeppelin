<template>
  <Toaster position="top-center" :toast-options="{ unstyled: true, class: 'toaster-toast' }">
    <template #success-icon>
      <CircleCheck class="success-icon" :size="18" :stroke-width="1.8" />
    </template>
    <template #error-icon>
      <CircleAlert class="error-icon" :size="18" :stroke-width="1.8" />
    </template>
  </Toaster>
</template>

<style>
.toaster-toast {
  background: red;
  box-shadow: 5px 5px 16px -2px rgba(0, 0, 0, 0.75);
  width: 100%;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;

  background-image:
    radial-gradient(circle at bottom right, rgba(0, 0, 0, 0.1) 0%, transparent 100%),
    repeating-linear-gradient(
      1deg,
      var(--stripe-color) 0px,
      var(--stripe-color) 1px,
      transparent 3px,
      transparent 5px,
      var(--stripe-color) 6px
    );
  background-color: #f4f0e4;

  color: var(--color-ink-dark);
  font: 14px/1.4 var(--font-stack-recursive);
}
</style>

<style scoped>
.success-icon {
  display: block;
  color: var(--color-steelblue-700);
}
.error-icon {
  display: block;
  color: var(--color-red-700);
}
</style>

<script setup lang="ts">
import { watch } from "vue";
import { usePage } from "@inertiajs/vue3";
import { toast, Toaster } from "vue-sonner";
import { CircleAlert, CircleCheck } from "lucide-vue-next";

const page = usePage();

watch(
  () => page.url,
  () => toast.dismiss(),
);

watch(
  () => page.flash,
  (flash) => {
    if (flash.error) toast.error(flash.error, { id: "flash" });
    if (flash.success) toast.success(flash.success, { id: "flash" });
  },
  { immediate: true },
);
</script>
