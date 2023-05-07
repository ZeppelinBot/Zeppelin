import { GuildMemberEditOptions, PermissionFlagsBits } from "discord.js";
import intersection from "lodash.intersection";
import { canAssignRole } from "../../../utils/canAssignRole";
import { getMissingPermissions } from "../../../utils/getMissingPermissions";
import { missingPermissionError } from "../../../utils/missingPermissionError";
import { LogsPlugin } from "../../Logs/LogsPlugin";
import { RoleManagerPlugin } from "../../RoleManager/RoleManagerPlugin";
import { persistEvt } from "../types";

const p = PermissionFlagsBits;

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

    const toRestore: GuildMemberEditOptions = {
      reason: "Restored upon rejoin",
    };
    const config = await pluginData.config.getForMember(member);
    const restoredData: string[] = [];

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

    const persistedRoles = config.persisted_roles;
    if (persistedRoles.length) {
      const roleManager = pluginData.getPlugin(RoleManagerPlugin);
      const rolesToRestore = intersection(persistedRoles, persistedData.roles, guildRoles);

      if (rolesToRestore.length) {
        restoredData.push("roles");
        for (const roleId of rolesToRestore) {
          roleManager.addRole(member.id, roleId);
        }
      }
    }

    if (config.persist_nicknames && persistedData.nickname) {
      restoredData.push("nickname");
      await member.edit({
        nick: persistedData.nickname,
      });
    }

    if (restoredData.length) {
      pluginData.getPlugin(LogsPlugin).logMemberRestore({
        member,
        restoredData: restoredData.join(", "),
      });
    }
  },
});
