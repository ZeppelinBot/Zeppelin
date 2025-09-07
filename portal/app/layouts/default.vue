<script setup lang="ts">
import BasicLink from '~/components/BasicLink.vue';

</script>

<template>
  <div class="layout">
    <div class="grid x64" aria-hidden="true"></div>
    <div class="grid x16" aria-hidden="true"></div>
    <div class="grid x8" aria-hidden="true"></div>

    <div class="wrap">
      <div class="header">
        <div class="logo">
          <img src="~/assets/logo.svg" />
        </div>
        <div class="menu">
          <div class="menu-item">Home</div>
          <div class="menu-item">Dashboard</div>
          <div class="menu-item">Documentation</div>
          <div class="menu-item">Privacy policy</div>
        </div>
      </div>
      <div class="content">
        <slot></slot>
      </div>
      <div class="footer">
        <div class="footer-links">
          <BasicLink href="#">GitHub</BasicLink>
          <BasicLink href="#">Privacy policy</BasicLink>
          <BasicLink href="#">Contact us</BasicLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
body {
  background: radial-gradient(circle at center, var(--color-steelblue-700), color-mix(in lab, var(--color-steelblue-700), black 30%));
}
</style>

<style scoped>
.layout {
  position: relative;
  width: 100vw;
  min-height: 100vh;
  color: white;
}

.grid {
  --grid-color: #ffffff;
  position: absolute;
  inset: 0;
  mask-position: top center;
  pointer-events: none;
}
.grid.x64 {
  background-color: color-mix(in lab, var(--grid-color), transparent 97%);
  mask-image: url(../assets/grid-64x64.png);
}
.grid.x16 {
  background-color: color-mix(in lab, var(--grid-color), transparent 99%);
  mask-image: url(../assets/grid-16x16.png);
}
.grid.x8 {
  background-color: color-mix(in lab, var(--grid-color), transparent 99%);
  mask-image: url(../assets/grid-8x8.png);
}

.wrap {
  min-height: 100vh;
  width: calc(64px * 16 + 64px);
  margin: 0 auto;
  padding: 64px 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 64px;
}

.header {
  height: 64px;
  display: flex;
  align-items: stretch;
  gap: 32px;
}
.logo {
  flex: 0 0 calc(64px * 4);
  margin: -16px 0 -17px;
  padding-left: 2px;
  /* transform: scaleX(-1); */
}
.logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: left center;
}
.menu {
  flex: 1 1 auto;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 32px;
  font-weight: 450;
}
.menu-item {
  padding: 0 16px;
}
.profile {
  flex: 0 0 calc(64px * 3);
  display: flex;
  align-items: center;
  gap: 48px;
}

.content {
  flex: 1 1 100%;
}

.footer {
  flex: 0 0 auto;
}
.footer-links {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 64px;
  height: 64px;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
  font-size: 14px;
}
</style>
