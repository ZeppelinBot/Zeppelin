<template>
  <div class="sidebar-paper">
    <div class="foreground-paper">
      <slot></slot>
    </div>
    <div class="background-paper"></div>
  </div>
</template>

<style scoped>
.sidebar-paper {
  position: relative;
  margin-top: 32px;
}
.foreground-paper {
  --stripe-color: rgba(0, 0, 0, 0.005);
  color: var(--color-ink-dark);
  position: relative;
  
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
  background-color: #e2dccb;

  border: 1px solid rgba(0, 0, 0, 0.1);

  box-shadow: 5px 5px 16px -2px rgba(0, 0, 0, 0.75);
  z-index: 2;

  padding: 24px;
}
.background-paper {
  position: absolute;
  inset: 0;
  z-index: 1;
  
  background-image: radial-gradient(circle at bottom right, rgba(0, 0, 0, 0.1) 0%, transparent 100%);
  background-color: #ece8dd;

  transform: rotateZ(-1deg) translateX(5px) translateY(5px);
  
  box-shadow: 5px 5px 12px -2px rgba(0, 0, 0, 0.25);
}
@media (prefers-color-scheme: dark) {
  .foreground-paper {
    --stripe-color: rgba(0, 0, 0, 0.03);
    background-image:
      linear-gradient(to bottom, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05)),
      radial-gradient(circle at bottom right, rgba(0, 0, 0, 0.1) 0%, transparent 100%),
      repeating-linear-gradient(
        1deg,
        var(--stripe-color) 0px,
        var(--stripe-color) 1px,
        transparent 3px,
        transparent 5px,
        var(--stripe-color) 6px
      ),
      url(../assets/charcoal-noise.webp);
    color: rgb(213, 213, 213);
    border: 1px solid #3b4141;
  }
  .background-paper {
    background-image:
      linear-gradient(to bottom, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05)),
      url(../assets/charcoal-noise.webp);
    border: 1px solid #3b4141;
  }
}
</style>

<script setup lang="ts">
</script>
