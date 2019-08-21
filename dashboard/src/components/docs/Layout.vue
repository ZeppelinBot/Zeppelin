<template>
  <div class="docs docs-cloak">
    <nav class="navbar" role="navigation" aria-label="main navigation">
      <div class="container">
        <div class="navbar-brand">
          <div class="navbar-item">
            <img class="docs-logo" src="../../img/logo.png" alt="" aria-hidden="true">
            <h1 class="docs-title">Zeppelin Documentation</h1>
          </div>
        </div>

        <div class="navbar-menu is-active">
          <div class="navbar-end">
            <router-link to="/dashboard" class="navbar-item">Go to dashboard</router-link>
          </div>
        </div>
      </div>
    </nav>

    <div class="wip-bar">
      <i class="mdi mdi-alert"></i>
      <strong>Note!</strong> This documentation is a work in progress.
    </div>

    <div class="wrapper">
      <div class="docs-sidebar">
        <div class="docs-sidebar-content">
          <aside class="menu">
            <p class="menu-label">General</p>
            <ul class="menu-list">
              <li><router-link to="/docs">Introduction</router-link></li>
              <li><router-link to="/docs/configuration-format">Configuration format</router-link></li>
              <li><router-link to="/docs/plugin-configuration">Plugin configuration</router-link></li>
              <li><router-link to="/docs/permissions">Permissions</router-link></li>
            </ul>

            <p class="menu-label">Descriptions</p>
            <ul class="menu-list">
              <li><router-link to="/docs/descriptions/argument-types">Argument types</router-link></li>
            </ul>

            <p class="menu-label">Plugins</p>
            <ul class="menu-list">
              <li v-for="plugin in plugins">
                <router-link :to="'/docs/plugins/' + plugin.name">{{ plugin.info.prettyName || plugin.name }}</router-link>
              </li>
            </ul>
          </aside>
        </div>
      </div>
      <div class="docs-main">
        <router-view :key="$route.fullPath"></router-view>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .docs-cloak {
    /* Replaced by "visible" in docs.scss */
    visibility: hidden;
  }

  .docs {
    width: 100%;
    max-width: 1280px;
    margin: 20px auto;
  }

  .navbar {
    border: 1px solid #4e5d6c;
    border-radius: 3px;
    margin-bottom: 24px;
    padding: 0 16px;
  }

  .docs-logo {
    margin-right: 12px;
  }

  .docs-title {
    font-weight: 600;
  }

  .wip-bar {
    padding: 4px 10px;
    margin-bottom: 24px;
    background-color: #2B3E50;
    border-radius: 4px;
  }

  .wip-bar i {
    color: #fdd7a5;
    font-size: 24px;
    vertical-align: -3px;
    margin-right: 6px;
  }

  .wrapper {
    display: flex;
  }

  .docs-sidebar {
    flex: 0 0 280px;
  }

  .docs-sidebar-content {
    /* can't scroll with a long list before reaching the end of the page, figure out */
    /*position: sticky;*/
    /*top: 20px;*/
  }

  .docs-sidebar .menu {
    padding: 12px 16px;
    border: 1px solid #4e5d6c;
    background-color: #2b3e50;
    border-radius: 3px;
  }

  .docs-sidebar .menu-label {
    font-weight: 600;
  }

  .docs-main {
    flex: 1 1 100%;
    padding: 0 24px 24px;
  }

  .docs-main >>> h4 {
    margin-top: 1.25em; /* ? */
  }
</style>

<script>
  import Vue from "vue";
  import VueHighlightJS from "vue-highlightjs";
  import {mapState} from "vuex";

  import "../../directives/trim-code";
  import "highlight.js/styles/ocean.css";
  import "../../style/docs.scss";

  Vue.use(VueHighlightJS);

  export default {
    async mounted() {
      await this.$store.dispatch("docs/loadAllPlugins");
    },
    computed: {
      ...mapState('docs', {
        plugins: 'allPlugins',
      }),
    },
  };
</script>
