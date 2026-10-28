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
          <MainMenuItem v-for="item in mainMenuItems" :active="menuItemIsActive(item, currentPath)">
            <Link :href="item.path">
              {{ item.label }}
            </Link>
            <Squiggle class="squiggle" />
          </MainMenuItem>
          <MainMenuItem v-if="page.props.user">
            <BasicButton theme="menu">
              <button @click="logout">Log out</button>
            </BasicButton>
          </MainMenuItem>
          <MainMenuItem v-else>
            <BasicButton theme="menu">
              <Link href="/oauth/discord/login">Log in</Link>
            </BasicButton>
          </MainMenuItem>
        </div>
        <div class="mobile-menu-toggle">
          <BasicButton theme="menu">
            <button role="button" aria-controls="mobile-menu" :aria-expanded="mobileMenuIsOpen" @click="mobileMenuIsOpen = !mobileMenuIsOpen">
              Menu
            </button>
          </BasicButton>
        </div>
      </div>
      <div id="mobile-menu" class="mobile-menu" :class="{ expanded: mobileMenuIsOpen }">
        <MainMenuItem v-for="item in mainMenuItems" :active="menuItemIsActive(item, currentPath)">
          <Link class="mobile-menu-item-link" :href="item.path">
            <div class="mobile-menu-item-text">
              {{ item.label }}
              <Squiggle class="squiggle" />
            </div>
          </Link>
        </MainMenuItem>
        <MainMenuItem v-if="page.props.user">
          <BasicButton theme="menu">
            <button @click="logout">Log out</button>
          </BasicButton>
        </MainMenuItem>
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

@layer base {
  a {
    color: #fff;
    text-decoration: underline;
  }
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
  width: calc(7 * var(--layout-grid-size));
  margin: 0 auto;
  padding: var(--layout-grid-size) 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--layout-grid-size);
  overflow: hidden;
}

.header {
  height: calc(var(--layout-grid-size) * 2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  padding: 0 24px;
}
.logo {
  flex: 0 0 calc(var(--layout-grid-size) * 4);
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
  flex: 0 0 auto;
  justify-content: flex-end;
  align-items: center;
  gap: 48px;
  font-weight: 450;
  padding-right: 8px;

  display: none;
}
.menu-item {
  padding: 0 16px;
}
.account {
  display: none;
}
.mobile-menu-toggle {
  flex: 0 0 auto;
}
.mobile-menu {
  display: none;
  background: url(../../assets/charcoal-noise.webp) repeat top left / 50% 50%, #222;
  padding: 24px;
  box-shadow: 5px 5px 16px -2px rgba(0, 0, 0, 0.75);
  margin-top: -48px;

  flex-direction: column;
  gap: 8px;
}
.mobile-menu.expanded {
  display: flex;
}
.mobile-menu-item-link {
  display: flex;
  width: 100%;
  justify-content: flex-start;
}

@media (min-width: 960px) {
  .main-layout-wrap {
    gap: calc(var(--layout-grid-size) * 2);
  }
  .header {
    padding: 0;
  }
  .logo {
    flex-basis: calc(var(--layout-grid-size) * 6);
  }
  .menu {
    display: flex;
  }
  .account {
    display: flex;
  }
  .mobile-menu-toggle {
    display: none;
  }
  .mobile-menu {
    display: none;
  }
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
import { MenuItem } from "#backend/features/menu/types";
import BasicButton from "#frontend/components/BasicButton.vue";
import BasicLink from "#frontend/components/BasicLink.vue";
import MainMenuItem from "#frontend/components/MainMenuItem.vue";
import Squiggle from "#frontend/components/Squiggle.vue";
import { LAYOUT_GRID_SIZE_PX } from "#frontend/features/layout/measurements.js";
import { menuItemIsActive } from "#frontend/features/menu/menuItemIsActive.js";
import FlashToasts from "#frontend/features/toasts/FlashToasts.vue";
import { useCurrentPath } from "#frontend/features/utils/useCurrentPath.js";
import { Link, useRouter } from "@adonisjs/inertia/vue";
import { usePage } from "@inertiajs/vue3";
import { computed, onMounted, ref } from "vue";

const page = usePage();
const currentPath = useCurrentPath();
const router = useRouter();

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

const breakpointSteps = [8, 9, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
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

const mainMenuItems = computed(() => {
  const items: MenuItem[] = [
    {
      label: "Home",
      path: "/",
    },
    {
      label: "Documentation",
      path: "/docs",
    },
    {
      label: "Dashboard",
      path: "/dashboard",
    },
  ];
  if (page.props.user) {
    items.push({
      label: "Account",
      path: "/account",
    });
  }
  return items;
});

const mobileMenuIsOpen = ref(false);

const logout = () => {
  router.post({ route: "auth.post_logout" }, {});
};
</script>
