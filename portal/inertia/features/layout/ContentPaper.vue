<template>
  <div class="content-paper">
    <div class="foreground-paper">
      <slot></slot>
      <div class="footer" aria-hidden="true">
        <div class="footer-left">{{ props.footerText }}</div>
        <div class="footer-right">{{ String(props.footerNumber).padStart(2, "0") }}</div>
      </div>
    </div>
    <div class="background-paper"></div>
  </div>
</template>

<style scoped>
.content-paper {
  position: relative;
}
.content-paper + .content-paper {
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

  padding: 12px;

  font: 16px/1.4 var(--font-stack-recursive);
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
    background:
      /* radial-gradient(circle at bottom right, rgba(0, 0, 0, 0.1) 0%, transparent 100%) 100% 100%, */
      repeating-linear-gradient(
        1deg,
        var(--stripe-color) 0px,
        var(--stripe-color) 1px,
        transparent 3px,
        transparent 5px,
        var(--stripe-color) 6px
      ) 100% 100%,
      url(../../assets/charcoal-noise.webp) repeat top left / 50% 50%,
      #222;
    color: rgb(213, 213, 213);
    border: 1px solid #3b4141;
  }
  .footer {
    color: rgb(80, 80, 80);
  }
  .background-paper {
    background-image: url(../../assets/charcoal-noise.webp);
    border: 1px solid #3b4141;
  }
}

@media (min-width: 960px) {
  .foreground-paper {
    padding: 32px;
  }
}

/* Content styles */
@layer base {
  .content-paper :deep(h1) {
    margin: 0 0 32px;
    font-size: 32px;
    font-weight: 700;
  }
  .content-paper :deep(h2) {
    margin: 0 0 12px;
    font-size: 24px;
    font-weight: 700;
  }
  .content-paper :deep(p) {
    margin: 0 0 48px;
  }
  .content-paper :deep(a) {
    color: currentColor;
  }
}
</style>

<script setup lang="ts">
const props = defineProps({
  footerText: {
    type: String,
    default: "Zeppelin",
  },
  footerNumber: {
    type: Number,
    default: 1,
  },
});
</script>
