<template>
  <div>
    <h1>Dashboard access</h1>
    <p>
      On this page you can manage who has access to the server's Zeppelin dashboard.
    </p>

    <h2 class="mt-8">Roles</h2>
    <ul>
      <li>
        <strong>Owner:</strong> All permissions. Managed automatically by the bot.
      </li>
      <li>
        <strong>Bot manager:</strong> Can manage dashboard users (including other bot managers) and edit server configuration
      </li>
      <li>
        <strong>Bot operator:</strong> Can edit server configuration
      </li>
    </ul>

    <h2 class="mt-8">Dashboard users</h2>
    <div class="mt-4">
      <div v-if="permanentPermissionAssignments.length === 0">
        No dashboard users
      </div>
      <ul v-if="permanentPermissionAssignments.length">
        <li v-for="perm in permanentPermissionAssignments">
          <div class="flex gap-4">
            <div>
              <strong>{{ perm.target_id }}</strong>
            </div>
            <div class="flex gap-4">
              <label class="block" v-if="isOwner(perm)">
                <input type="checkbox" checked="checked" disabled>
                Owner
              </label>
              <label class="block">
                <input
                  type="checkbox"
                  :checked="hasPermission(perm, 'MANAGE_ACCESS')"
                  @change="ev => setPermissionValue(perm, 'MANAGE_ACCESS', ev.target.checked)"
                  :disabled="hasPermissionIndirectly(perm, 'MANAGE_ACCESS')"
                >
                Bot manager
              </label>
              <label class="block">
                <input
                  type="checkbox"
                  :checked="hasPermission(perm, 'EDIT_CONFIG')"
                  @change="ev => setPermissionValue(perm, 'EDIT_CONFIG', ev.target.checked)"
                  :disabled="hasPermissionIndirectly(perm, 'EDIT_CONFIG')"
                >
                Bot operator
              </label>
              <a href="#" v-on:click="deletePermissionAssignment(perm)" v-if="!isOwner(perm)">
                Delete
              </a>
            </div>
          </div>
        </li>
      </ul>
      <div class="mt-2">
        <a href="#" v-on:click="addPermissionAssignment()">
          Add new user
        </a>
      </div>
    </div>

    <h2 class="mt-8">Temporary dashboard users</h2>
    <p>
      You can add temporary dashboard users to e.g. request help from a person outside your organization.<br>
      Temporary users always have <strong>Bot operator</strong> permissions.
    </p>
    <div v-if="temporaryPermissionAssignments.length === 0">
      No temporary dashboard users
    </div>
    <ul v-if="temporaryPermissionAssignments.length">
      <li v-for="perm in temporaryPermissionAssignments">
        <div class="flex gap-4">
          <div>
            <strong>{{ perm.target_id }}</strong>
          </div>
          <div>
            Expires in {{ formatTimeRemaining(perm) }}
          </div>
          <div>
            <a href="#" v-on:click="deletePermissionAssignment(perm)">
              Delete
            </a>
          </div>
        </div>
      </li>
    </ul>
    <div class="mt-2">
      <a href="#" v-on:click="addTemporaryPermissionAssignment()">
        Add temporary user for 1 hour
      </a>
    </div>
  </div>
</template>

<script lang="ts">
import { ApiPermissions, hasPermission } from "@shared/apiPermissions";
import PermissionTree from "./PermissionTree.vue";
import { mapState } from "vuex";
import {
  GuildPermissionAssignment,
  GuildState,
  RootState
} from "../../store/types";
import humanizeDuration from "humanize-duration";
import moment from "moment";

export default {
    components: {PermissionTree},

    data() {
      return {
        managerPermissions: new Set([ApiPermissions.ManageAccess]),
      };
    },

    computed: {
      ...mapState({
        canManage(state: RootState): boolean {
          const guildPermissions = state.guilds.guildPermissionAssignments[this.$route.params.guildId] || [];
          const myPermissions = guildPermissions.find(p => p.type === "USER" && p.target_id === state.auth.userId) || null;
          return myPermissions && hasPermission(myPermissions.permissions, ApiPermissions.ManageAccess);
        },
      }),
      ...mapState<GuildState>("guilds", {
        permanentPermissionAssignments(guilds: GuildState): GuildPermissionAssignment[] {
          return (guilds.guildPermissionAssignments[this.$route.params.guildId] || []).filter(perm => perm.expires_at == null);
        },

        temporaryPermissionAssignments(guilds: GuildState): GuildPermissionAssignment[] {
          return (guilds.guildPermissionAssignments[this.$route.params.guildId] || []).filter(perm => perm.expires_at != null);
        },
      }),
    },

    async mounted() {
      await this.$store.dispatch("guilds/loadGuildPermissionAssignments", this.$route.params.guildId).catch(() => {});

      if (! this.canManage) {
        this.$router.push('/dashboard');
        return;
      }
    },
    methods: {
      isOwner(perm: GuildPermissionAssignment) {
        return perm.permissions.has(ApiPermissions.Owner);
      },

      hasPermission(perm: GuildPermissionAssignment, permissionName: ApiPermissions) {
        return hasPermission(perm.permissions, permissionName);
      },

      hasPermissionIndirectly(perm: GuildPermissionAssignment, permissionName: ApiPermissions) {
        return hasPermission(perm.permissions, permissionName) && ! perm.permissions.has(permissionName);
      },

      setPermissionValue(perm: GuildPermissionAssignment, permissionName: ApiPermissions, value) {
        if (value) {
          perm.permissions.add(permissionName);
        } else {
          perm.permissions.delete(permissionName);
        }

        this.$store.dispatch("guilds/setTargetPermissions", {
          guildId: this.$route.params.guildId,
          type: perm.type,
          targetId: perm.target_id,
          permissions: Array.from(perm.permissions),
          expiresAt: null,
        });

        this.$set(perm, "permissions", new Set(perm.permissions));
      },

      onTreeUpdate(targetPermissions) {
        this.$store.dispatch("guilds/setTargetPermissions", {
          guildId: this.$route.params.guildId,
          targetId: targetPermissions.target_id,
          type: targetPermissions.type,
          permissions: targetPermissions.permissions,
        });
      },

      formatTimeRemaining(perm: GuildPermissionAssignment) {
        const ms = Math.max(moment.utc(perm.expires_at).valueOf() - Date.now(), 0);
        return humanizeDuration(ms, { largest: 2, round: true });
      },

      addPermissionAssignment() {
        const userId = window.prompt("Enter user ID");
        if (!userId) {
          return;
        }

        this.$store.dispatch("guilds/setTargetPermissions", {
          guildId: this.$route.params.guildId,
          type: "USER",
          targetId: userId,
          permissions: [ApiPermissions.EditConfig],
          expiresAt: null,
        });
      },

      addTemporaryPermissionAssignment() {
        const userId = window.prompt("Enter user ID");
        if (!userId) {
          return;
        }

        const expiresAt = moment.utc().add(1, "hour").format("YYYY-MM-DD HH:mm:ss");
        this.$store.dispatch("guilds/setTargetPermissions", {
          guildId: this.$route.params.guildId,
          type: "USER",
          targetId: userId,
          permissions: [ApiPermissions.EditConfig],
          expiresAt,
        });
      },

      deletePermissionAssignment(perm: GuildPermissionAssignment) {
        const confirm = window.confirm(`Remove ${perm.target_id} from dashboard users?`);
        if (! confirm) {
          return;
        }

        this.$store.dispatch("guilds/setTargetPermissions", {
          guildId: this.$route.params.guildId,
          type: perm.type,
          targetId: perm.target_id,
          permissions: [],
          expiresAt: null,
        });
      },
    }
  }
</script>
