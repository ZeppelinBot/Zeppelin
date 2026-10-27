<template>
  <ul class="sidebar-menu">
    <li v-for="menuCategory of props.categories">
      <div class="title">{{ menuCategory.title }}</div>
      <ul class="submenu">
        <li v-for="item of menuCategory.items">
          <Link class="menu-link" :class="{ active: isActive(item) }" :href="item.path">
            {{ item.label }}
            <Squiggle class="squiggle" />
          </Link>
        </li>
      </ul>
    </li>
  </ul>
</template>

<style scoped>
.title {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-size: 24px;
  font-weight: 600;
  padding-left: 8px;
}

.sidebar-menu,
.submenu {
  list-style: none;
  margin: 0;
  padding: 0;
}

.sidebar-menu > li + li {
  margin-top: 48px;
}

.submenu > li {
  height: 24px;
  padding-left: 8px;
  display: flex;
  align-items: center;
}

.menu-link {
  color: rgba(255, 255, 255, 0.9);
  text-decoration: none;
}

.squiggle {
  display: none;
}
.menu-link.active .squiggle {
  display: block;
}
</style>

<script setup lang="ts">
import { MenuCategory, MenuItem } from '#backend/features/menu/types';
import Squiggle from '#frontend/components/Squiggle.vue';
import { Link } from '@adonisjs/inertia/vue';
import { PropType } from 'vue';

const props = defineProps({
  categories: {
    type: Array as PropType<MenuCategory[]>,
    required: true,
  },
  currentPath: {
    type: String,
    default: "",
  },
});

const isActive = (item: MenuItem) => {
  return item.activeStartsWith ? props.currentPath.startsWith(item.path) : props.currentPath === item.path;
};
</script>
