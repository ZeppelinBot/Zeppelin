<template>
  <button :class="`theme-${props.theme}`">
    <slot />
  </button>
</template>

<style scoped>
button {
  --bg-color: rgba(0, 0, 0, 0.02);
  --fg-color: var(--color-ink-dark);
  --stripe-color: color-mix(in lab, var(--fg-color), transparent 95%);

  display: inline-block;
  font: inherit;
  display: block;
  appearance: none;
  color: var(--fg-color);
  border: 0.1em solid var(--fg-color);
  border-radius: 8px;
  font-weight: 400;
  cursor: pointer;

  padding: 0.5em 1em;

  background-color: var(--bg-color);
  background-image:
    repeating-linear-gradient(
      32deg,
      var(--stripe-color) 0px,
      var(--stripe-color) 1px,
      transparent 3px,
      transparent 5px,
      var(--stripe-color) 6px
    );
  position: relative;

  /* box-shadow: 2px 5px 0px var(--color-steelblue-800); */
  box-shadow: 0 0.15em 0px var(--fg-color);
}
button:hover {
  /* --bg-color: rgba(255, 255, 255, 0.1); */
  /* --fg-color: color-mix(in lab, currentColor, white 10%); */
  box-shadow: 0 0.075em 0px var(--fg-color);
  transform: translateY(0.075em);
}
button:active {
  box-shadow: none;
  transform: translateY(0.15em);
}
.theme-dark {
  --fg-color: rgb(200, 200, 200);
}
.theme-menu {
  --fg-color: rgb(232, 232, 232);
}
@media (prefers-color-scheme: dark) {
  button.theme-auto {
    --fg-color: rgb(200, 200, 200);
  }
}
</style>

<script setup lang="ts">
const props = defineProps({
  theme: {
    type: String,
    default: "auto",
  },
});
</script>
