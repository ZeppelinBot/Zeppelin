<template>
  <div class="layout">
    <Teleport v-if="mounted" to="head">
      <component :is="'style'" v-text="rootCss" />
      <component :is="'style'" v-text="wrapCss" />
    </Teleport>

    <div class="main-layout-wrap" :style="styleObj">
      <div class="header">
        <div class="logo">
          <img src="#frontend/assets/logo.svg" />
          <div class="name">Zeppelin</div>
        </div>
        <div class="menu" role="menubar" aria-label="Main menu">
          <MainMenuItem :active="true">
            <Link route="splash.get_index">Home</Link>
          </MainMenuItem>
          <MainMenuItem :active="false">
            <Link href="#">Dashboard</Link>
          </MainMenuItem>
          <MainMenuItem :active="false">
            <Link href="#">Documentation</Link>
          </MainMenuItem>
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
    <FlashToasts />
  </div>
</template>

<style>
:root {
  --layout-grid-size: 1px; /* Fallback. Set properly programmatically in the script block. */
}
body {
  --grid1-size: 48px;
  --grid2-size: calc(var(--grid1-size) / 2);

  --grid1-color: rgba(255, 255, 255, 0.03);
  --grid2-color: rgba(255, 255, 255, 0.02);

  --bg-color1: var(--color-steelblue-700);
  --bg-color2: color-mix(in lab, var(--color-steelblue-700), black 40%);

  background:
    /* Grid 1 */
    linear-gradient(var(--grid1-color) 1px, transparent 1px) repeat calc(50% - var(--grid1-size) / 2) top / var(--grid1-size) var(--grid1-size),
    linear-gradient(90deg, var(--grid1-color) 1px, transparent 1px) repeat calc(50% - var(--grid1-size) / 2) top / var(--grid1-size) var(--grid1-size),

    /* Grid 2 */
    linear-gradient(var(--grid2-color) 1px, transparent 1px) repeat calc(50% - var(--grid2-size) / 2) top / var(--grid2-size) var(--grid2-size),
    linear-gradient(90deg, var(--grid2-color) 1px, transparent 1px) repeat calc(50% - var(--grid2-size) / 2) top / var(--grid2-size) var(--grid2-size),

    /* "Light" / vignette */
    radial-gradient(
      circle at 50% 160px,
      var(--bg-color1) 0,
      var(--bg-color2) 1200px
    ) no-repeat center / 100% 100%;
  
  min-height: 100vh;
  font: 14px/1.4 var(--font-stack-playpen-sans);
}
a {
  color: #fff;
  text-decoration: underline;
}

@media (prefers-color-scheme: dark) {
  body {
    --bg-color1: rgb(32, 32, 32);
    --bg-color2: rgb(10, 10, 10);
  }
}
/* body::before {
  display: block;
  content: " ";
  position: absolute;
  top: 0;
  left: calc(50% - 1px);
  bottom: 0;
  border-left: 2px solid red;
} */
</style>

<style scoped>
.layout {
  position: relative;
  color: white;
}

.main-layout-wrap {
  width: calc(1 * var(--layout-grid-size));
  margin: 0 auto;
  padding: var(--layout-grid-size) 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: calc(var(--layout-grid-size) * 2);
}

.header {
  height: calc(var(--layout-grid-size) * 2);
  display: flex;
  align-items: stretch;
  gap: 32px;
}
.logo {
  flex: 0 0 calc(var(--layout-grid-size) * 6);
  margin: -16px 0 -17px;
  padding-left: 2px;
  position: relative;
}
.logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: left center;
}
.logo .name {
  font: 24px/1 var(--font-stack-recursive);
  font-weight: 500;
  padding: 4px 8px;
  background-color: #f4f0e4;
  color: #293d49;
  box-shadow: 3px 3px 12px -2px rgba(0, 0, 0);
  position: absolute;
  top: 50%;
  right: 50px;
  transform: translateY(-50%) rotateZ(-5deg);
  transform-origin: 50% 50%;
}
.menu {
  flex: 1 1 auto;
  justify-content: flex-end;
  align-items: center;
  gap: 48px;
  font-weight: 450;
  padding-right: 8px;

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

<script setup lang="ts">
import BasicLink from "#frontend/components/BasicLink.vue";
import MainMenuItem from "#frontend/components/MainMenuItem.vue";
import { LAYOUT_GRID_SIZE_PX } from "#frontend/features/layout/measurements.js";
import FlashToasts from "#frontend/features/toasts/FlashToasts.vue";
import { Link } from "@adonisjs/inertia/vue";
import { computed, onMounted, ref } from "vue";

const props = defineProps({
  maxWidthStep: {
    type: Number,
    default: 24,
  },
});

const styleObj = computed(() => ({
  maxWidth: `${props.maxWidthStep * LAYOUT_GRID_SIZE_PX}px`,
}));

const mounted = ref(false);
onMounted(() => {
  mounted.value = true;
});

const rootCss = computed(() => `
  :root {
    --layout-grid-size: ${LAYOUT_GRID_SIZE_PX}px;
  }
`);

const breakpointSteps = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
const wrapCss = computed(() => {
  return breakpointSteps
    .map((step) => `
      @media (min-width: ${step * LAYOUT_GRID_SIZE_PX}px) {
        .main-layout-wrap {
          width: ${step * LAYOUT_GRID_SIZE_PX}px !important;
        }
      }
    `)
    .join("\n");
});
</script>
