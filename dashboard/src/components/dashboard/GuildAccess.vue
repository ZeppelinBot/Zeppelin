<template>
  <div>
    <h1>Guild Access</h1>
    <p>
      <img class="inline-block w-16 mr-4" style="vertical-align: -20px" src="../../img/squint.png"> Or here
    </p>
    <permission-tree :tree="tree" :granted-permissions="grantedPermissions" :on-change="onChange" />
  </div>
</template>

<script lang="ts">
  import { ApiPermissions, permissionHierarchy } from "@shared/apiPermissions";
  import PermissionTree from "./PermissionTree.vue";
  import { applyStateToPermissionHierarchy } from "./permissionTreeUtils";

  export default {
    components: {PermissionTree},
    data() {
      return {
        tree: [],
        grantedPermissions: new Set([ApiPermissions.EditConfig]),
        managerPermissions: new Set([ApiPermissions.ManageAccess])
      };
    },
    beforeMount() {
      this.tree = applyStateToPermissionHierarchy(permissionHierarchy, this.grantedPermissions, this.managerPermissions);
    },
    methods: {
      updateTreeState() {
        this.tree = applyStateToPermissionHierarchy(permissionHierarchy, this.grantedPermissions, this.managerPermissions);
      },

      onChange() {
        console.log('changed!', this.grantedPermissions);
        this.updateTreeState();
      }
    }
  }
</script>
