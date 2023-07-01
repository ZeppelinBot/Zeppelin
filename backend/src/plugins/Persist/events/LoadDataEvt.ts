import { GuildMember, PermissionFlagsBits } from "discord.js";
import { GuildPluginData } from "knub";
import intersection from "lodash.intersection";
import { PersistedData } from "../../../data/entities/PersistedData";
import { SECONDS } from "../../../utils";
import { canAssignRole } from "../../../utils/canAssignRole";
import { getMissingPermissions } from "../../../utils/getMissingPermissions";
import { missingPermissionError } from "../../../utils/missingPermissionError";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { RoleManagerPlugin } from "../../RoleManager/RoleManagerPlugin";
import { PersistPluginType, persistEvt } from "../types";

const p = PermissionFlagsBits;

async function applyPersistedData(
  pluginData: GuildPluginData<PersistPluginType>,
  persistedData: PersistedData,
  member: GuildMember,
): Promise<string[]> {
  const config = await pluginData.config.getForMember(member);
  const guildRoles = Array.from(pluginData.guild.roles.cache.keys());
  const restoredData: string[] = [];

  const persistedRoles = config.persisted_roles;
  if (persistedRoles.length) {
    const roleManager = pluginData.getPlugin(RoleManagerPlugin);
    const rolesToRestore = intersection(persistedRoles, persistedData.roles, guildRoles).filter(
      (roleId) => !member.roles.cache.has(roleId),
    );

    if (rolesToRestore.length) {
      restoredData.push("roles");
      for (const roleId of rolesToRestore) {
        roleManager.addRole(member.id, roleId);
      }
    }
  }

  if (config.persist_nicknames && persistedData.nickname && member.nickname !== persistedData.nickname) {
    restoredData.push("nickname");
    await member.edit({
      nick: persistedData.nickname,
    });
  }

  return restoredData;
}

export const LoadDataEvt = persistEvt({
  event: "guildMemberAdd",

  async listener(meta) {
    const member = meta.args.member;
    const pluginData = meta.pluginData;

    const persistedData = await pluginData.state.persistedData.find(member.id);
    if (!persistedData) {
      return;
    }
    await pluginData.state.persistedData.clear(member.id);

    const config = await pluginData.config.getForMember(member);

    // Check permissions
    const me = pluginData.guild.members.cache.get(pluginData.client.user!.id)!;
    let requiredPermissions = 0n;
    if (config.persist_nicknames) requiredPermissions |= p.ManageNicknames;
    if (config.persisted_roles) requiredPermissions |= p.ManageRoles;
    const missingPermissions = getMissingPermissions(me.permissions, requiredPermissions);
    if (missingPermissions) {
      pluginData.getPlugin(LogsPlugin).logBotAlert({
        body: `Missing permissions for persist plugin: ${missingPermissionError(missingPermissions)}`,
      });
      return;
    }

    const guildRoles = Array.from(pluginData.guild.roles.cache.keys());

    // Check specific role permissions
    if (config.persisted_roles) {
      for (const roleId of config.persisted_roles) {
        if (!canAssignRole(pluginData.guild, me, roleId) && guildRoles.includes(roleId)) {
          pluginData.getPlugin(LogsPlugin).logBotAlert({
            body: `Missing permissions to assign role \`${roleId}\` in persist plugin`,
          });
          return;
        }
      }
    }

    const restoredData = await applyPersistedData(pluginData, persistedData, member);
    setTimeout(() => {
      // Reapply persisted data after a while for better interop with other bots that restore roles
      void applyPersistedData(pluginData, persistedData, member);
    }, 5 * SECONDS);

    if (restoredData.length) {
      pluginData.getPlugin(LogsPlugin).logMemberRestore({
        member,
        restoredData: restoredData.join(", "),
      });
    }
  },
});
