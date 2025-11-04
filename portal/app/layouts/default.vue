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
        <div class="menu" role="menubar" aria-label="Main menu">
          <MainMenuItem to="/" :active="route.path === '/'">Home</MainMenuItem>
          <MainMenuItem to="/dashboard" :active="route.path.startsWith('/dashboard')">Dashboard</MainMenuItem>
          <MainMenuItem to="/documentation" :active="route.path.startsWith('/documentation')">Documentation</MainMenuItem>
          <MainMenuItem to="/privacy-policy" :active="route.path.startsWith('/privacy-policy')">Privacy policy</MainMenuItem>
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

<script setup lang="ts">
import { useRoute } from '#app';
import BasicLink from '~/components/BasicLink.vue';
import MainMenuItem from '~/components/MainMenuItem.vue';

const route = useRoute();
</script>

<style>
body {
  background: radial-gradient(circle at 50% 160px, var(--color-steelblue-700) 0, color-mix(in lab, var(--color-steelblue-700), black 40%) 1200px);
}
</style>

<style scoped>
/**
 * Breakpoints to use with blueprint grid:
 * 320px = 5 * 64px
 * 448px = 7 * 64px
 * 576px = 9 * 64px
 * 704px = 11 * 64px
 * 832px = 13 * 64px
 * 960px = 15 * 64px
 * 1088px = 17 * 64px
 */

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
  width: calc(5 * 64px);
  margin: 0 auto;
  padding: 64px 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 64px;
}
@media (min-width: 448px) {
  .wrap {
    width: calc(7 * 64px);
  }
}
@media (min-width: 448px) {
  .wrap {
    width: calc(7 * 64px);
  }
}
@media (min-width: 576px) {
  .wrap {
    width: calc(9 * 64px);
  }
}
@media (min-width: 704px) {
  .wrap {
    width: calc(11 * 64px);
  }
}
@media (min-width: 832px) {
  .wrap {
    width: calc(13 * 64px);
  }
}
@media (min-width: 960px) {
  .wrap {
    width: calc(15 * 64px);
  }
}
@media (min-width: 1088px) {
  .wrap {
    width: calc(17 * 64px);
  }
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
}
.logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: left center;
}
.menu {
  flex: 1 1 auto;
  justify-content: flex-end;
  align-items: center;
  gap: 32px;
  font-weight: 450;

  display: none;
}
@media (min-width: 832px) {
  .menu {
    display: flex;
  }
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
