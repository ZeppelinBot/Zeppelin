import { decryptJson } from "#backend/crypt";
import ApiAuditLog from "#backend/features/api/models/ApiAuditLog";
import ApiLogin from "#backend/features/api/models/ApiLogin";
import ApiPermission from "#backend/features/api/models/ApiPermission";
import ApiUserInfo from "#backend/features/api/models/ApiUserInfo";
import PortalUser from "#backend/features/auth/models/PortalUser";
import Config from "#backend/features/config/models/Config";
import AllowedGuild from "#backend/features/guilds/models/AllowedGuild";
import SavedMessage from "#backend/features/messages/models/SavedMessage";
import Reminder from "#backend/features/reminders/models/Reminder";
import Supporter from "#backend/features/supporters/models/Supporter";
import MemberTimezone from "#backend/features/timeAndDate/models/MemberTimezone";
import { TransactionClientContract } from "@adonisjs/lucid/types/database";
import db from "@adonisjs/lucid/services/db";

export interface DataContainer<Columns extends string> {
  columns: Columns[];
  rows: Array<Record<Columns, string>>;
}

interface UserSelfServeTools<Columns extends string> {
  getData?: (userId: string) => Promise<DataContainer<Columns>>;
  deleteData?: (userId: string, trx: TransactionClientContract) => Promise<void>;
  getGuildIdsProcessingData?: (userId: string) => Promise<string[]>;
}

interface ServerSelfServeTools {
  getUserData?: (guildId: string, userId: string) => Promise<unknown[]>;
  deleteUserData?: (guildId: string, userId: string, trx: TransactionClientContract) => Promise<void>;
}

export interface AccountDataCategory<UserColumns extends string> {
  name: string;
  prettyName: string;
  controller: "zeppelin" | "server";
  userSelfServeTools: UserSelfServeTools<UserColumns>;
  serverSelfServeTools: ServerSelfServeTools;
}

export const accountDataCategories: AccountDataCategory<any>[] = [];

function addAccountDataCategory<UserColumns extends string>(category: AccountDataCategory<UserColumns>): void {
  accountDataCategories.push(category);
}

addAccountDataCategory({
  name: "dashboard_user_data",
  prettyName: "Dashboard user data",
  controller: "zeppelin",

  userSelfServeTools: {
    getData: async (userId) => {
      const apiUserInfos = await ApiUserInfo.query().where("id", "=", userId).select();

      return {
        columns: ["userId", "username", "discriminator", "avatar"],
        rows: apiUserInfos.map((info) => {
          const data = JSON.parse(info.data);
          return {
            userId: info.id,
            username: data.username ?? "",
            discriminator: data.discriminator ?? "",
            avatar: data.avatar ?? "",
          };
        }),
      };
    },

    deleteData: async (userId, trx) => {
      await ApiUserInfo.query({ client: trx }).where("id", "=", userId).delete();
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "dashboard_login_data",
  prettyName: "Dashboard login data",
  controller: "zeppelin",

  userSelfServeTools: {
    getData: async (userId) => {
      const apiLogins = await ApiLogin.query().where("user_id", "=", userId).select();

      return {
        columns: ["userId", "loggedInAt", "expiresAt"],
        rows: apiLogins.map((login) => {
          return {
            userId: login.userId,
            loggedInAt: login.loggedInAt.toISO() ?? "",
            expiresAt: login.expiresAt.toISO() ?? "",
          };
        }),
      };
    },

    deleteData: async (userId, trx) => {
      await ApiLogin.query({ client: trx }).where("user_id", "=", userId).delete();
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "new_dashboard_user_and_login_data",
  prettyName: "New dashboard user and login data",
  controller: "zeppelin",

  userSelfServeTools: {
    getData: async (userId) => {
      const portalUsers = await PortalUser.query().where("discord_user_id", "=", userId).select();

      return {
        columns: ["userId", "username", "avatarUrl", "createdAt", "lastLoginAt"],
        rows: portalUsers.map((portalUser) => ({
          userId: portalUser.discordUserId,
          username: portalUser.discordUsername,
          avatarUrl: portalUser.discordAvatarUrl ?? "",
          createdAt: portalUser.createdAt.toISO() ?? "",
          lastLoginAt: portalUser.lastLoginAt.toISO() ?? "",
        })),
      };
    },

    deleteData: async (userId, trx) => {
      await PortalUser.query({ client: trx }).where("discord_user_id", "=", userId).delete();
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "dashboard_permissions",
  prettyName: "Dashboard permissions",
  controller: "zeppelin",

  userSelfServeTools: {
    getData: async (userId) => {
      const permissions = await ApiPermission.query().where("target_id", "=", userId).select();

      return {
        columns: ["serverId", "userId", "type", "permissions", "expiresAt"],
        rows: permissions.map((p) => ({
          serverId: p.guildId,
          userId: p.targetId,
          type: p.type,
          permissions: p.permissions,
          expiresAt: p.expiresAt?.toISO() ?? "",
        })),
      };
    },

    deleteData: async (userId, trx) => {
      await ApiPermission.query({ client: trx }).where("target_id", "=", userId).delete();
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "dashboard_server_configuration_metadata",
  prettyName: "Dashboard server configuration metadata",
  controller: "zeppelin",

  userSelfServeTools: {
    getData: async (userId) => {
      const configMetadata = await Config.query()
        .where("edited_by", "=", userId)
        .select("configs.key", "configs.edited_by", "configs.edited_at");

      return {
        columns: ["key", "editedBy", "editedAt"],
        rows: configMetadata.map((m) => ({
          key: m.key,
          editedBy: m.editedBy,
          editedAt: m.editedAt.toISO() ?? "",
        })),
      };
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "dashboard_audit_logs",
  prettyName: "Dashboard audit logs",
  controller: "zeppelin",

  userSelfServeTools: {
    getData: async (userId) => {
      const auditLogEntries = await ApiAuditLog.query().where("author_id", "=", userId).select();

      return {
        columns: ["serverId", "authorId", "eventType", "timestamp"],
        rows: auditLogEntries.map((item) => ({
          serverId: item.guildId,
          authorId: item.authorId,
          eventType: item.eventType,
          timestamp: item.createdAt.toISO() ?? "",
        })),
      };
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "data_about_servers_allowed_to_use_zeppelin",
  prettyName: "Data about servers allowed to use Zeppelin",
  controller: "zeppelin",

  userSelfServeTools: {
    getData: async (userId) => {
      const allowedGuilds = await AllowedGuild.query().where("owner_id", "=", userId).select();

      return {
        columns: ["serverId", "name", "icon", "ownerId", "createdAt", "updatedAt"],
        rows: allowedGuilds.map((item) => ({
          serverId: item.id,
          name: item.name ?? "",
          icon: item.icon ?? "",
          ownerId: item.ownerId ?? "",
          createdAt: item.createdAt.toISO() ?? "",
          updatedAt: item.updatedAt.toISO() ?? "",
        })),
      };
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "supporters",
  prettyName: "Supporters",
  controller: "zeppelin",

  userSelfServeTools: {
    getData: async (userId) => {
      const supporters = await Supporter.query().where("user_id", "=", userId).select();

      return {
        columns: ["userId", "name", "amount"],
        rows: supporters.map((item) => ({
          userId: item.userId,
          name: item.name,
          amount: item.amount ?? "",
        })),
      };
    },

    deleteData: async (userId, trx) => {
      await Supporter.query({ client: trx }).where("user_id", "=", userId).delete();
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "recent_messages",
  prettyName: "Recent messages",
  controller: "server",

  userSelfServeTools: {
    getData: async (userId) => {
      const recentMessages = await SavedMessage.query().where("user_id", "=", userId).select();

      return {
        columns: [
          "messageId",
          "serverId",
          "channelId",
          "userId",
          "isBot",
          "data",
          "postedAt",
          "deletedAt",
          "isPermanent",
        ],
        rows: recentMessages.map((item) => ({
          messageId: item.id,
          serverId: item.guildId,
          channelId: item.channelId,
          userId: item.userId,
          isBot: item.isBot ? "Yes" : "No",
          data: JSON.stringify(decryptJson(item.data)),
          postedAt: item.postedAt.toISO() ?? "",
          deletedAt: item.deletedAt?.toISO() ?? "",
          isPermanent: item.isPermanent ? "Yes" : "No",
        })),
      };
    },

    getGuildIdsProcessingData: async (userId) => {
      const result = await db.from("messages").where("user_id", "=", userId).select(db.raw("DISTINCT guild_id"));
      return result.map((r) => r.guild_id);
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "message_archives",
  prettyName: "Message archives",
  controller: "server",

  userSelfServeTools: {},
  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "server_configuration",
  prettyName: "Server configuration",
  controller: "server",

  userSelfServeTools: {},
  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "moderation_cases",
  prettyName: "Moderation cases",
  controller: "server",

  userSelfServeTools: {
    getGuildIdsProcessingData: async (userId) => {
      const result = await db
        .from("cases")
        .leftJoin("case_notes", "case_notes.case_id", "=", "cases.id")
        .where((q) => {
          q.orWhere("cases.user_id", "=", userId);
          q.orWhere("cases.mod_id", "=", userId);
          q.orWhere("cases.pp_id", "=", userId);
          q.orWhere("case_notes.mod_id", "=", userId);
        })
        .select(db.raw("DISTINCT cases.guild_id"));
      return result.map((r) => r.guild_id);
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "mute_information",
  prettyName: "Mute information",
  controller: "server",

  userSelfServeTools: {
    getGuildIdsProcessingData: async (userId) => {
      const result = await db.from("mutes").where("user_id", "=", userId).select(db.raw("DISTINCT mutes.guild_id"));
      return result.map((r) => r.guild_id);
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "counters",
  prettyName: "Counters",
  controller: "server",

  userSelfServeTools: {
    getGuildIdsProcessingData: async (userId) => {
      const result = await db
        .from("counters")
        .leftJoin("counter_values", "counter_values.counter_id", "=", "counters.id")
        .where("counter_values.user_id", "=", userId)
        .select(db.raw("DISTINCT counters.guild_id"));
      return result.map((r) => r.guild_id);
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "persisted_member_data",
  prettyName: "Persisted member data",
  controller: "server",

  userSelfServeTools: {
    getGuildIdsProcessingData: async (userId) => {
      const result = await db.from("persisted_data").where("user_id", "=", userId).select(db.raw("DISTINCT guild_id"));
      return result.map((r) => r.guild_id);
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "member_timezones",
  prettyName: "Member timezones",
  controller: "server",

  userSelfServeTools: {
    getData: async (userId) => {
      const memberTimezones = await MemberTimezone.query().where("member_id", userId).select();

      return {
        columns: ["serverId", "userId", "timezone"],
        rows: memberTimezones.map((item) => ({
          serverId: item.guildId,
          userId: item.memberId,
          timezone: item.timezone,
        })),
      };
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "reminders",
  prettyName: "Reminders",
  controller: "server",

  userSelfServeTools: {
    getData: async (userId) => {
      const reminders = await Reminder.query().where("user_id", userId).select();

      return {
        columns: ["serverId", "userId", "channelId", "remindAt", "body", "createdAt"],
        rows: reminders.map((item) => ({
          serverId: item.guildId,
          userId: item.userId,
          channelId: item.channelId,
          remindAt: item.remindAt.toISO() ?? "",
          body: item.body,
          createdAt: item.createdAt.toISO() ?? "",
        })),
      };
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "role_queue",
  prettyName: "Role queue",
  controller: "server",

  userSelfServeTools: {
    getGuildIdsProcessingData: async (userId) => {
      const result = await db.from("role_queue").where("user_id", "=", userId).select(db.raw("DISTINCT guild_id"));
      return result.map((r) => r.guild_id);
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "scheduled_posts",
  prettyName: "Scheduled posts",
  controller: "server",

  userSelfServeTools: {
    getGuildIdsProcessingData: async (userId) => {
      const result = await db
        .from("scheduled_posts")
        .where("author_id", "=", userId)
        .select(db.raw("DISTINCT guild_id"));
      return result.map((r) => r.guild_id);
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "slowmode",
  prettyName: "Slowmode",
  controller: "server",

  userSelfServeTools: {
    getGuildIdsProcessingData: async (userId) => {
      const result = await db.from("slowmode_users").where("user_id", "=", userId).select(db.raw("DISTINCT guild_id"));
      return result.map((r) => r.guild_id);
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "starboard",
  prettyName: "Starboard",
  controller: "server",

  userSelfServeTools: {
    getGuildIdsProcessingData: async (userId) => {
      const result = await db
        .from("starboard_reactions")
        .where("reactor_id", "=", userId)
        .select(db.raw("DISTINCT guild_id"));
      return result.map((r) => r.guild_id);
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "tags",
  prettyName: "Tags",
  controller: "server",

  userSelfServeTools: {
    getGuildIdsProcessingData: async (userId) => {
      const result = await db.from("tags").where("user_id", "=", userId).select(db.raw("DISTINCT guild_id"));
      return result.map((r) => r.guild_id);
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "temporary_bans",
  prettyName: "Temporary bans",
  controller: "server",

  userSelfServeTools: {
    getGuildIdsProcessingData: async (userId) => {
      const result = await db
        .from("tempbans")
        .where((q) => {
          q.orWhere("user_id", "=", userId);
          q.orWhere("mod_id", "=", userId);
        })
        .select(db.raw("DISTINCT guild_id"));
      return result.map((r) => r.guild_id);
    },
  },

  serverSelfServeTools: {},
});

addAccountDataCategory({
  name: "vc_alerts",
  prettyName: "Voice channel alerts",
  controller: "server",

  userSelfServeTools: {
    getGuildIdsProcessingData: async (userId) => {
      const result = await db
        .from("vc_alerts")
        .where((q) => {
          q.orWhere("user_id", "=", userId);
          q.orWhere("requestor_id", "=", userId);
        })
        .select(db.raw("DISTINCT guild_id"));
      return result.map((r) => r.guild_id);
    },
  },

  serverSelfServeTools: {},
});
