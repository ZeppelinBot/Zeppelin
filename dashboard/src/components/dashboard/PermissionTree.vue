<template>
  <ul class="nostyles">
    <li v-for="[permission, treeState, subTree] in tree" :class="{locked: treeState.locked}">
      <label>
        <input type="checkbox"
               :checked="grantedPermissions.has(permission) || treeState.redundant"
               v-on:input="togglePermission(permission)"
               :disabled="treeState.locked || treeState.redundant">
        <span>{{ permissionNames[permission] }}</span>
      </label>
      <permission-tree v-if="subTree && subTree.length"
                       :tree="subTree"
                       :granted-permissions="grantedPermissions"
                       :on-change="onChange" />
    </li>
  </ul>
</template>

<style scoped>
  ul {
    list-style: none;

    & ul {
      padding-left: 16px;
    }
  }

  .locked > label {
    opacity: 0.5;
  }
</style>

<script lang="ts">
  import { ApiPermissions, permissionNames } from "@shared/apiPermissions";
  import { PropType } from "vue";
  import { TPermissionHierarchyWithState } from "./permissionTreeUtils";

  export default {
    name: 'permission-tree',
    props: {
      tree: Array as PropType<TPermissionHierarchyWithState>,
      grantedPermissions: Set as PropType<Set<ApiPermissions>>,
      onChange: Function
    },
    data() {
      return { permissionNames };
    },
    methods: {
      togglePermission(permission) {
        if (this.grantedPermissions.has(permission)) {
          this.grantedPermissions.delete(permission);
        } else {
          this.grantedPermissions.add(permission);
        }

        if (this.onChange) {
          this.onChange();
        }
      },
    },
  }
</script>
