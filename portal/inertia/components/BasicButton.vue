<template>
  <Slot class="button" :class="`theme-${props.theme}`">
    <slot />
  </Slot>
</template>

<style scoped>
/* Reset target element styles */
@layer reset {
  button.button {
    appearance: none;
    background: transparent;
    border: none;
    color: inherit;
    font: inherit;
  }

  a.button {
    color: inherit;
    font: inherit;
    text-decoration: none;
  }
}

/* Actual button styles */
.button {
  --bg-color: rgba(0, 0, 0, 0.02);
  --fg-color: var(--color-ink-dark);
  --stripe-color: color-mix(in lab, var(--fg-color), transparent 95%);

  display: inline-block;
  color: var(--fg-color);
  border: 0.1em solid var(--fg-color);
  border-radius: 8px;
  font-weight: 400;
  cursor: pointer;

  padding: 0.5em 1em;

  background-color: var(--bg-color);
  background-image: repeating-linear-gradient(
    32deg,
    var(--stripe-color) 0px,
    var(--stripe-color) 1px,
    transparent 3px,
    transparent 5px,
    var(--stripe-color) 6px
  );
  position: relative;

  box-shadow: 0 0.15em 0px var(--fg-color);
}
.button:hover {
  box-shadow: 0 0.075em 0px var(--fg-color);
  transform: translateY(0.075em);
}
.button:active {
  box-shadow: none;
  transform: translateY(0.15em);
}
.theme-dark {
  --fg-color: rgb(200, 200, 200);
}
.theme-menu {
  --fg-color: rgb(232, 232, 232);
}
.theme-danger {
  --fg-color: rgb(170, 21, 21);
}
@media (prefers-color-scheme: dark) {
  .button.theme-auto {
    --fg-color: rgb(200, 200, 200);
  }
  .theme-danger {
    --fg-color: rgb(255, 96, 96);
  }
}
</style>

<script setup lang="ts">
import { Slot } from "reka-ui";

const props = defineProps({
  theme: {
    type: String,
    default: "auto",
  },
});
</script>
