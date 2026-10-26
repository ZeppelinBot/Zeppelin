<template>
  <div class="content-paper">
    <div class="foreground-paper">
      <slot></slot>
      <div class="footer" aria-hidden="true">
        <div class="footer-left">Zeppelin Specification</div>
        <div class="footer-right">01</div>
      </div>
    </div>
    <div class="background-paper"></div>
  </div>
</template>

<style scoped>
.content-paper {
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
  background-color: #f4f0e4;

  border: 1px solid rgba(0, 0, 0, 0.1);

  box-shadow: 5px 5px 16px -2px rgba(0, 0, 0, 0.75);
  z-index: 2;

  padding: 32px 32px 24px 32px;
}
.footer {
  padding-top: 64px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: color-mix(in lab, var(--color-gray-900), transparent 70%);
  user-select: none;
  pointer-events: none;
  font-weight: 500;
  font-size: 13px;
}
.background-paper {
  position: absolute;
  inset: 0;
  z-index: 1;
  
  background-image: radial-gradient(circle at bottom right, rgba(0, 0, 0, 0.1) 0%, transparent 100%);
  background-color: #ece8dd;

  transform: rotateZ(1deg) translateX(5px);
  
  box-shadow: 5px 5px 12px -2px rgba(0, 0, 0, 0.25);
}
@media (prefers-color-scheme: dark) {
  .foreground-paper {
    --stripe-color: rgba(0, 0, 0, 0.03);
    background-image:
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
  .footer {
    color: rgb(80, 80, 80);
  }
  .background-paper {
    background-image: url(../assets/charcoal-noise.webp);
    border: 1px solid #3b4141;
  }
}
</style>

<script setup lang="ts">
</script>
