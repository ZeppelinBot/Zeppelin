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
              <li><router-link to="/docs/plugins/locate-user">Locate user</router-link></li>
              <li><router-link to="/docs/plugins/mod-actions">Mod actions</router-link></li>
            </ul>
          </aside>
        </div>
      </div>
      <div class="docs-main content">
        <router-view></router-view>
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

  .wrapper {
    display: flex;
  }

  .docs-sidebar {
    flex: 0 0 280px;
  }

  .docs-sidebar-content {
    position: sticky;
    top: 20px;
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
  import "../../directives/trim-code";
  import "highlight.js/styles/ocean.css";

  Vue.use(VueHighlightJS);

  export default {
    async mounted() {
      await import("../../style/docs.scss");
    },
  };
</script>
