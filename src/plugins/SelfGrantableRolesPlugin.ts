import { Plugin, decorators as d, IBasePluginConfig, IPluginOptions } from "knub";
import { GuildSelfGrantableRoles } from "../data/GuildSelfGrantableRoles";
import { GuildChannel, Message, Role, TextChannel } from "eris";
import { chunkArray, errorMessage, sorter, successMessage } from "../utils";
import { ZeppelinPlugin } from "./ZeppelinPlugin";

interface ISelfGrantableRolesPluginPermissions {
  manage: boolean;
  use: boolean;
  ignore_cooldown: boolean;
}

export class SelfGrantableRolesPlugin extends ZeppelinPlugin<IBasePluginConfig, ISelfGrantableRolesPluginPermissions> {
  public static pluginName = "self_grantable_roles";

  protected selfGrantableRoles: GuildSelfGrantableRoles;

  getDefaultOptions(): IPluginOptions<IBasePluginConfig, ISelfGrantableRolesPluginPermissions> {
    return {
      config: {},

      permissions: {
        manage: false,
        use: false,
        ignore_cooldown: false,
      },

      overrides: [
        {
          level: ">=50",
          permissions: {
            ignore_cooldown: true,
          },
        },
        {
          level: ">=100",
          permissions: {
            manage: true,
          },
        },
      ],
    };
  }

  onLoad() {
    this.selfGrantableRoles = GuildSelfGrantableRoles.getInstance(this.guildId);
  }

  @d.command("role remove", "<roleNames:string...>")
  @d.permission("use")
  @d.cooldown(2500, "ignore_cooldown")
  async roleRemoveCmd(msg: Message, args: { roleNames: string[] }) {
    const lock = await this.locks.acquire(`grantableRoles:${msg.author.id}`);

    const channelGrantableRoles = await this.selfGrantableRoles.getForChannel(msg.channel.id);
    if (channelGrantableRoles.length === 0) {
      lock.unlock();
      return;
    }

    const nonMatchingRoleNames: string[] = [];
    const rolesToRemove: Set<Role> = new Set();

    // Match given role names with actual grantable roles
    const roleNames = args.roleNames.map(n => n.split(/[\s,]+/)).flat();
    for (const roleName of roleNames) {
      const normalized = roleName.toLowerCase();
      let matched = false;

      for (const grantableRole of channelGrantableRoles) {
        if (grantableRole.aliases.includes(normalized)) {
          if (this.guild.roles.has(grantableRole.role_id)) {
            rolesToRemove.add(this.guild.roles.get(grantableRole.role_id));
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        nonMatchingRoleNames.push(roleName);
      }
    }

    // Remove the roles
    if (rolesToRemove.size) {
      const rolesToRemoveArr = Array.from(rolesToRemove.values());
      const roleIdsToRemove = rolesToRemoveArr.map(r => r.id);
      const newRoleIds = msg.member.roles.filter(roleId => !roleIdsToRemove.includes(roleId));

      try {
        await msg.member.edit({
          roles: newRoleIds,
        });

        const removedRolesStr = rolesToRemoveArr.map(r => `**${r.name}**`);
        const removedRolesWord = rolesToRemoveArr.length === 1 ? "role" : "roles";

        if (nonMatchingRoleNames.length) {
          msg.channel.createMessage(
            successMessage(
              `<@!${msg.author.id}> Removed ${removedRolesStr.join(", ")} ${removedRolesWord};` +
                ` couldn't recognize the other roles you mentioned`,
            ),
          );
        } else {
          msg.channel.createMessage(
            successMessage(`<@!${msg.author.id}> Removed ${removedRolesStr.join(", ")} ${removedRolesWord}`),
          );
        }
      } catch (e) {
        msg.channel.createMessage(errorMessage(`<@!${msg.author.id}> Got an error while trying to remove the roles`));
      }
    } else {
      msg.channel.createMessage(
        errorMessage(`<@!${msg.author.id}> Unknown ${args.roleNames.length === 1 ? "role" : "roles"}`),
      );
    }

    lock.unlock();
  }

  @d.command("role", "<roleNames:string...>")
  @d.permission("use")
  @d.cooldown(2500, "ignore_cooldown")
  async roleCmd(msg: Message, args: { roleNames: string[] }) {
    const lock = await this.locks.acquire(`grantableRoles:${msg.author.id}`);

    const channelGrantableRoles = await this.selfGrantableRoles.getForChannel(msg.channel.id);
    if (channelGrantableRoles.length === 0) {
      lock.unlock();
      return;
    }

    const nonMatchingRoleNames: string[] = [];
    const rolesToGrant: Set<Role> = new Set();

    // Match given role names with actual grantable roles
    const roleNames = args.roleNames.map(n => n.split(/[\s,]+/)).flat();
    for (const roleName of roleNames) {
      const normalized = roleName.toLowerCase();
      let matched = false;

      for (const grantableRole of channelGrantableRoles) {
        if (grantableRole.aliases.includes(normalized)) {
          if (this.guild.roles.has(grantableRole.role_id)) {
            rolesToGrant.add(this.guild.roles.get(grantableRole.role_id));
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        nonMatchingRoleNames.push(roleName);
      }
    }

    // Grant the roles
    if (rolesToGrant.size) {
      const rolesToGrantArr = Array.from(rolesToGrant.values());
      const roleIdsToGrant = rolesToGrantArr.map(r => r.id);
      const newRoleIds = Array.from(new Set(msg.member.roles.concat(roleIdsToGrant)).values());
      try {
        await msg.member.edit({
          roles: newRoleIds,
        });

        const grantedRolesStr = rolesToGrantArr.map(r => `**${r.name}**`);
        const grantedRolesWord = rolesToGrantArr.length === 1 ? "role" : "roles";

        if (nonMatchingRoleNames.length) {
          msg.channel.createMessage(
            successMessage(
              `<@!${msg.author.id}> Granted you the ${grantedRolesStr.join(", ")} ${grantedRolesWord};` +
                ` couldn't recognize the other roles you mentioned`,
            ),
          );
        } else {
          msg.channel.createMessage(
            successMessage(`<@!${msg.author.id}> Granted you the ${grantedRolesStr.join(", ")} ${grantedRolesWord}`),
          );
        }
      } catch (e) {
        msg.channel.createMessage(
          errorMessage(`<@!${msg.author.id}> Got an error while trying to grant you the roles`),
        );
      }
    } else {
      msg.channel.createMessage(
        errorMessage(`<@!${msg.author.id}> Unknown ${args.roleNames.length === 1 ? "role" : "roles"}`),
      );
    }

    lock.unlock();
  }

  @d.command("self_grantable_roles add", "<channel:channel> <roleId:string> [aliases:string...]")
  @d.permission("manage")
  async addSelfGrantableRoleCmd(msg: Message, args: { channel: GuildChannel; roleId: string; aliases?: string[] }) {
    if (!(args.channel instanceof TextChannel)) {
      msg.channel.createMessage(errorMessage("Invalid channel (must be a text channel)"));
      return;
    }

    const role = this.guild.roles.get(args.roleId);
    if (!role) {
      msg.channel.createMessage(errorMessage("Unknown role"));
      return;
    }

    const aliases = (args.aliases || []).map(n => n.split(/[\s,]+/)).flat();
    aliases.unshift(role.name);
    const normalizedAliases = aliases.map(a => a.toLowerCase());
    const uniqueAliases = Array.from(new Set(normalizedAliases).values());

    // Remove existing self grantable role on that channel, if one exists
    await this.selfGrantableRoles.delete(args.channel.id, role.id);

    // Add new one
    await this.selfGrantableRoles.add(args.channel.id, role.id, uniqueAliases);

    msg.channel.createMessage(
      successMessage(`Self-grantable role **${role.name}** added to **#${args.channel.name}**`),
    );
  }

  @d.command("self_grantable_roles delete", "<channel:channel> <roleId:string>")
  @d.permission("manage")
  async deleteSelfGrantableRoleCmd(msg: Message, args: { channel: GuildChannel; roleId: string }) {
    await this.selfGrantableRoles.delete(args.channel.id, args.roleId);

    const roleName = this.guild.roles.has(args.roleId) ? this.guild.roles.get(args.roleId).name : args.roleId;

    msg.channel.createMessage(
      successMessage(`Self-grantable role **${roleName}** removed from **#${args.channel.name}**`),
    );
  }

  @d.command("self_grantable_roles", "<channel:channel>")
  @d.permission("manage")
  async selfGrantableRolesCmd(msg: Message, args: { channel: GuildChannel }) {
    if (!(args.channel instanceof TextChannel)) {
      msg.channel.createMessage(errorMessage("Invalid channel (must be a text channel)"));
      return;
    }

    const channelGrantableRoles = await this.selfGrantableRoles.getForChannel(args.channel.id);
    if (channelGrantableRoles.length === 0) {
      msg.channel.createMessage(errorMessage(`No self-grantable roles on **#${args.channel.name}**`));
      return;
    }

    channelGrantableRoles.sort(sorter(gr => gr.aliases.join(", ")));

    const longestId = channelGrantableRoles.reduce((longest, gr) => Math.max(longest, gr.role_id.length), 0);
    const lines = channelGrantableRoles.map(gr => {
      const paddedId = gr.role_id.padEnd(longestId, " ");
      return `${paddedId} ${gr.aliases.join(", ")}`;
    });

    const batches = chunkArray(lines, 20);
    for (const batch of batches) {
      await msg.channel.createMessage(`\`\`\`js\n${batch.join("\n")}\n\`\`\``);
    }
  }
}
