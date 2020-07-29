<template>
  <div>
    <h1>Guild Access</h1>
    <p>
      <img class="inline-block w-16 mr-4" style="vertical-align: -20px" src="../../img/squint.png"> Or here
    </p>
    <div v-for="permAssignment in permissionAssignments">
      <strong>{{ permAssignment.type }} {{ permAssignment.target_id }}</strong>
      <permission-tree :tree="permAssignment._permissionTree" :granted-permissions="permAssignment.permissions" :on-change="onTreeUpdate.bind(null, permAssignment)" />
    </div>
  </div>
</template>

<script lang="ts">
  import { ApiPermissions, permissionHierarchy } from "@shared/apiPermissions";
  import PermissionTree from "./PermissionTree.vue";
  import { applyStateToPermissionHierarchy } from "./permissionTreeUtils";
  import { mapState } from "vuex";
  import { GuildState } from "../../store/types";

  export default {
    components: {PermissionTree},
    data() {
      return {
        managerPermissions: new Set([ApiPermissions.ManageAccess]),
      };
    },
    computed: {
      ...mapState<GuildState>("guilds", {
        canManage(guilds) {
          return guilds.myPermissions[this.$route.params.guildId]?.[ApiPermissions.ManageAccess];
        },

        permissionAssignments(guilds) {
          return (guilds.guildPermissionAssignments[this.$route.params.guildId] || []).map(permAssignment => {
            return {
              ...permAssignment,
              _permissionTree: applyStateToPermissionHierarchy(permissionHierarchy, permAssignment.permissions, this.managerPermissions),
            };
          });
        },
      }),
    },
    // beforeMount() {
    //   this.tree = applyStateToPermissionHierarchy(permissionHierarchy, this.grantedPermissions, this.managerPermissions);
    // },
    async mounted() {
      await this.$store.dispatch("guilds/checkPermission", {
        guildId: this.$route.params.guildId,
        permission: ApiPermissions.ManageAccess,
      });

      if (! this.canManage) {
        this.$router.push('/dashboard');
        return;
      }

      await this.$store.dispatch("guilds/loadGuildPermissionAssignments", this.$route.params.guildId);
    },
    methods: {
      // updateTreeState() {
      //   this.tree = applyStateToPermissionHierarchy(permissionHierarchy, this.grantedPermissions, this.managerPermissions);
      // },
      //
      // onChange() {
      //   this.updateTreeState();
      // }

      onTreeUpdate(targetPermissions) {
        this.$store.dispatch("guilds/setTargetPermissions", {
          guildId: this.$route.params.guildId,
          targetId: targetPermissions.target_id,
          type: targetPermissions.type,
          permissions: targetPermissions.permissions,
        });
      }
    }
  }
</script>
