import { decorators as d, IPluginOptions } from "knub";
import { GuildSelfGrantableRoles } from "../data/GuildSelfGrantableRoles";
import { GuildChannel, Message, Role, TextChannel } from "eris";
import { asSingleLine, chunkArray, errorMessage, sorter, successMessage, trimLines } from "../utils";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import * as t from "io-ts";

const ConfigSchema = t.type({
  can_manage: t.boolean,
  can_use: t.boolean,
  can_ignore_cooldown: t.boolean,
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export class SelfGrantableRolesPlugin extends ZeppelinPlugin<TConfigSchema> {
  public static pluginName = "self_grantable_roles";
  public static showInDocs = false;
  public static configSchema = ConfigSchema;

  protected selfGrantableRoles: GuildSelfGrantableRoles;

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
    return {
      config: {
        can_manage: false,
        can_use: false,
        can_ignore_cooldown: false,
      },

      overrides: [
        {
          level: ">=50",
          config: {
            can_ignore_cooldown: true,
          },
        },
        {
          level: ">=100",
          config: {
            can_manage: true,
          },
        },
      ],
    };
  }

  onLoad() {
    this.selfGrantableRoles = GuildSelfGrantableRoles.getGuildInstance(this.guildId);
  }

  @d.command("role remove", "<roleNames:string...>")
  @d.permission("can_use")
  @d.cooldown(2500, "can_ignore_cooldown")
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
    const roleNames = new Set(
      args.roleNames
        .map(n => n.split(/[\s,]+/))
        .flat()
        .map(v => v.toLowerCase()),
    );
    for (const roleName of roleNames) {
      let matched = false;

      for (const grantableRole of channelGrantableRoles) {
        let matchedAlias = false;

        for (const alias of grantableRole.aliases) {
          const normalizedAlias = alias.toLowerCase();
          if (roleName === normalizedAlias && this.guild.roles.has(grantableRole.role_id)) {
            rolesToRemove.add(this.guild.roles.get(grantableRole.role_id));
            matched = true;
            matchedAlias = true;
            break;
          }
        }

        if (matchedAlias) break;
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
          this.sendSuccessMessage(
            msg.channel,
            `<@!${msg.author.id}> Removed ${removedRolesStr.join(", ")} ${removedRolesWord};` +
              ` couldn't recognize the other roles you mentioned`,
          );
        } else {
          this.sendSuccessMessage(
            msg.channel,
            `<@!${msg.author.id}> Removed ${removedRolesStr.join(", ")} ${removedRolesWord}`,
          );
        }
      } catch (e) {
        this.sendSuccessMessage(msg.channel, `<@!${msg.author.id}> Got an error while trying to remove the roles`);
      }
    } else {
      msg.channel.createMessage(
        errorMessage(`<@!${msg.author.id}> Unknown ${args.roleNames.length === 1 ? "role" : "roles"}`),
      );
    }

    lock.unlock();
  }

  @d.command("role", "<roleNames:string...>")
  @d.permission("can_use")
  @d.cooldown(1500, "can_ignore_cooldown")
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
    const roleNames = new Set(
      args.roleNames
        .map(n => n.split(/[\s,]+/))
        .flat()
        .map(v => v.toLowerCase()),
    );

    for (const roleName of roleNames) {
      let matched = false;

      for (const grantableRole of channelGrantableRoles) {
        let matchedAlias = false;

        for (const alias of grantableRole.aliases) {
          const normalizedAlias = alias.toLowerCase();
          if (roleName === normalizedAlias && this.guild.roles.has(grantableRole.role_id)) {
            rolesToGrant.add(this.guild.roles.get(grantableRole.role_id));
            matched = true;
            matchedAlias = true;
            break;
          }
        }

        if (matchedAlias) break;
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
          this.sendSuccessMessage(
            msg.channel,
            `<@!${msg.author.id}> Granted you the ${grantedRolesStr.join(", ")} ${grantedRolesWord};` +
              ` couldn't recognize the other roles you mentioned`,
          );
        } else {
          this.sendSuccessMessage(
            msg.channel,
            `<@!${msg.author.id}> Granted you the ${grantedRolesStr.join(", ")} ${grantedRolesWord}`,
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

  @d.command("role help", [], {
    aliases: ["role"],
  })
  @d.permission("can_use")
  @d.cooldown(5000, "can_ignore_cooldown")
  async roleHelpCmd(msg: Message) {
    const channelGrantableRoles = await this.selfGrantableRoles.getForChannel(msg.channel.id);
    if (channelGrantableRoles.length === 0) return;

    const prefix = this.guildConfig.prefix;
    const firstRole = channelGrantableRoles[0].aliases[0];
    const secondRole = channelGrantableRoles[1] ? channelGrantableRoles[1].aliases[0] : null;

    const help1 = asSingleLine(`
      To give yourself a role, type e.g. \`${prefix}role ${firstRole}\` where **${firstRole}** is the role you want.
      ${secondRole ? `You can also add multiple roles at once, e.g. \`${prefix}role ${firstRole} ${secondRole}\`` : ""}
    `);

    const help2 = asSingleLine(`
      To remove a role, type \`!role remove ${firstRole}\`,
      again replacing **${firstRole}** with the role you want to remove.
    `);

    const helpMessage = trimLines(`
      ${help1}

      ${help2}

      **Available roles:**
      ${channelGrantableRoles.map(r => r.aliases[0]).join(", ")}
    `);

    const helpEmbed = {
      title: "How to get roles",
      description: helpMessage,
      color: parseInt("42bff4", 16),
    };

    msg.channel.createMessage({ embed: helpEmbed });
  }

  @d.command("self_grantable_roles add", "<channel:channel> <roleId:string> [aliases:string...]")
  @d.permission("can_manage")
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
    aliases.push(role.name.replace(/\s+/g, ""));
    const uniqueAliases = Array.from(new Set(aliases).values());

    // Remove existing self grantable role on that channel, if one exists
    await this.selfGrantableRoles.delete(args.channel.id, role.id);

    // Add new one
    await this.selfGrantableRoles.add(args.channel.id, role.id, uniqueAliases);

    this.sendSuccessMessage(msg.channel, `Self-grantable role **${role.name}** added to **#${args.channel.name}**`);
  }

  @d.command("self_grantable_roles delete", "<channel:channel> <roleId:string>")
  @d.permission("can_manage")
  async deleteSelfGrantableRoleCmd(msg: Message, args: { channel: GuildChannel; roleId: string }) {
    await this.selfGrantableRoles.delete(args.channel.id, args.roleId);

    const roleName = this.guild.roles.has(args.roleId) ? this.guild.roles.get(args.roleId).name : args.roleId;

    this.sendSuccessMessage(msg.channel, `Self-grantable role **${roleName}** removed from **#${args.channel.name}**`);
  }

  @d.command("self_grantable_roles", "<channel:channel>")
  @d.permission("can_manage")
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
