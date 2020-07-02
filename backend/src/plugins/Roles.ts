import { trimPluginDescription, ZeppelinPluginClass } from "./ZeppelinPluginClass";
import * as t from "io-ts";
import { resolveMember, stripObjectToScalars, successMessage, verboseUserMention } from "../utils";
import { decorators as d, IPluginOptions, logger } from "knub";
import { GuildChannel, Member, Message } from "eris";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";

const ConfigSchema = t.type({
  can_assign: t.boolean,
  can_mass_assign: t.boolean,
  assignable_roles: t.array(t.string),
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export class RolesPlugin extends ZeppelinPluginClass<TConfigSchema> {
  public static pluginName = "roles";
  public static configSchema = ConfigSchema;

  public static pluginInfo = {
    prettyName: "Roles",
    description: trimPluginDescription(`
      Enables authorised users to add and remove whitelisted roles with a command.
    `),
  };

  protected logs: GuildLogs;

  onLoad() {
    this.logs = new GuildLogs(this.guildId);
  }

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
    return {
      config: {
        can_assign: false,
        can_mass_assign: false,
        assignable_roles: [],
      },
      overrides: [
        {
          level: ">=50",
          config: {
            can_assign: true,
          },
        },
        {
          level: ">=100",
          config: {
            can_mass_assign: true,
          },
        },
      ],
    };
  }

  @d.command("addrole", "<member:member> <role:string$>", {
    extra: {
      info: {
        description: "Add a role to the specified member",
      },
    },
  })
  @d.permission("can_assign")
  async addRoleCmd(msg: Message, args: { member: Member; role: string }) {
    if (!this.canActOn(msg.member, args.member, true)) {
      return this.sendErrorMessage(msg.channel, "Cannot add roles to this user: insufficient permissions");
    }

    const roleId = await this.resolveRoleId(args.role);
    if (!roleId) {
      return this.sendErrorMessage(msg.channel, "Invalid role id");
    }

    const config = this.getConfigForMsg(msg);
    if (!config.assignable_roles.includes(roleId)) {
      return this.sendErrorMessage(msg.channel, "You cannot assign that role");
    }

    // Sanity check: make sure the role is configured properly
    const role = (msg.channel as GuildChannel).guild.roles.get(roleId);
    if (!role) {
      this.logs.log(LogType.BOT_ALERT, {
        body: `Unknown role configured for 'roles' plugin: ${roleId}`,
      });
      return this.sendErrorMessage(msg.channel, "You cannot assign that role");
    }

    if (args.member.roles.includes(roleId)) {
      return this.sendErrorMessage(msg.channel, "Member already has that role");
    }

    this.logs.ignoreLog(LogType.MEMBER_ROLE_ADD, args.member.id);

    await args.member.addRole(roleId);

    this.logs.log(LogType.MEMBER_ROLE_ADD, {
      member: stripObjectToScalars(args.member, ["user", "roles"]),
      roles: role.name,
      mod: stripObjectToScalars(msg.author),
    });

    this.sendSuccessMessage(msg.channel, `Added role **${role.name}** to ${verboseUserMention(args.member.user)}!`);
  }

  @d.command("massaddrole", "<role:string> <members:string...>")
  @d.permission("can_mass_assign")
  async massAddRoleCmd(msg: Message, args: { role: string; members: string[] }) {
    msg.channel.createMessage(`Resolving members...`);

    const members = [];
    const unknownMembers = [];
    for (const memberId of args.members) {
      const member = await resolveMember(this.bot, this.guild, memberId);
      if (member) members.push(member);
      else unknownMembers.push(memberId);
    }

    for (const member of members) {
      if (!this.canActOn(msg.member, member, true)) {
        return this.sendErrorMessage(
          msg.channel,
          "Cannot add roles to 1 or more specified members: insufficient permissions",
        );
      }
    }

    const roleId = await this.resolveRoleId(args.role);
    if (!roleId) {
      return this.sendErrorMessage(msg.channel, "Invalid role id");
    }

    const config = this.getConfigForMsg(msg);
    if (!config.assignable_roles.includes(roleId)) {
      return this.sendErrorMessage(msg.channel, "You cannot assign that role");
    }

    const role = this.guild.roles.get(roleId);
    if (!role) {
      this.logs.log(LogType.BOT_ALERT, {
        body: `Unknown role configured for 'roles' plugin: ${roleId}`,
      });
      return this.sendErrorMessage(msg.channel, "You cannot assign that role");
    }

    const membersWithoutTheRole = members.filter(m => !m.roles.includes(roleId));
    let assigned = 0;
    const failed = [];
    const alreadyHadRole = members.length - membersWithoutTheRole.length;

    msg.channel.createMessage(
      `Adding role **${role.name}** to ${membersWithoutTheRole.length} ${
        membersWithoutTheRole.length === 1 ? "member" : "members"
      }...`,
    );

    for (const member of membersWithoutTheRole) {
      try {
        this.logs.ignoreLog(LogType.MEMBER_ROLE_ADD, member.id);
        await member.addRole(roleId);
        this.logs.log(LogType.MEMBER_ROLE_ADD, {
          member: stripObjectToScalars(member, ["user", "roles"]),
          roles: role.name,
          mod: stripObjectToScalars(msg.author),
        });
        assigned++;
      } catch (e) {
        logger.warn(`Error when adding role via !massaddrole: ${e.message}`);
        failed.push(member.id);
      }
    }

    let resultMessage = `Added role **${role.name}** to ${assigned} ${assigned === 1 ? "member" : "members"}!`;
    if (alreadyHadRole) {
      resultMessage += ` ${alreadyHadRole} ${alreadyHadRole === 1 ? "member" : "members"} already had the role.`;
    }

    if (failed.length) {
      resultMessage += `\nFailed to add the role to the following members: ${failed.join(", ")}`;
    }

    if (unknownMembers.length) {
      resultMessage += `\nUnknown members: ${unknownMembers.join(", ")}`;
    }

    msg.channel.createMessage(successMessage(resultMessage));
  }

  @d.command("removerole", "<member:member> <role:string$>", {
    extra: {
      info: {
        description: "Remove a role from the specified member",
      },
    },
  })
  @d.permission("can_assign")
  async removeRoleCmd(msg: Message, args: { member: Member; role: string }) {
    if (!this.canActOn(msg.member, args.member, true)) {
      return this.sendErrorMessage(msg.channel, "Cannot remove roles from this user: insufficient permissions");
    }

    const roleId = await this.resolveRoleId(args.role);
    if (!roleId) {
      return this.sendErrorMessage(msg.channel, "Invalid role id");
    }

    const config = this.getConfigForMsg(msg);
    if (!config.assignable_roles.includes(roleId)) {
      return this.sendErrorMessage(msg.channel, "You cannot remove that role");
    }

    // Sanity check: make sure the role is configured properly
    const role = (msg.channel as GuildChannel).guild.roles.get(roleId);
    if (!role) {
      this.logs.log(LogType.BOT_ALERT, {
        body: `Unknown role configured for 'roles' plugin: ${roleId}`,
      });
      return this.sendErrorMessage(msg.channel, "You cannot remove that role");
    }

    if (!args.member.roles.includes(roleId)) {
      return this.sendErrorMessage(msg.channel, "Member doesn't have that role");
    }

    this.logs.ignoreLog(LogType.MEMBER_ROLE_REMOVE, args.member.id);

    await args.member.removeRole(roleId);

    this.logs.log(LogType.MEMBER_ROLE_REMOVE, {
      member: stripObjectToScalars(args.member, ["user", "roles"]),
      roles: role.name,
      mod: stripObjectToScalars(msg.author),
    });

    this.sendSuccessMessage(
      msg.channel,
      `Removed role **${role.name}** removed from ${verboseUserMention(args.member.user)}!`,
    );
  }

  @d.command("massremoverole", "<role:string> <members:string...>")
  @d.permission("can_mass_assign")
  async massRemoveRoleCmd(msg: Message, args: { role: string; members: string[] }) {
    const members = [];
    const unknownMembers = [];
    for (const memberId of args.members) {
      const member = await resolveMember(this.bot, this.guild, memberId);
      if (member) members.push(member);
      else unknownMembers.push(memberId);
    }

    for (const member of members) {
      if (!this.canActOn(msg.member, member, true)) {
        return this.sendErrorMessage(
          msg.channel,
          "Cannot add roles to 1 or more specified members: insufficient permissions",
        );
      }
    }

    const roleId = await this.resolveRoleId(args.role);
    if (!roleId) {
      return this.sendErrorMessage(msg.channel, "Invalid role id");
    }

    const config = this.getConfigForMsg(msg);
    if (!config.assignable_roles.includes(roleId)) {
      return this.sendErrorMessage(msg.channel, "You cannot remove that role");
    }

    const role = this.guild.roles.get(roleId);
    if (!role) {
      this.logs.log(LogType.BOT_ALERT, {
        body: `Unknown role configured for 'roles' plugin: ${roleId}`,
      });
      return this.sendErrorMessage(msg.channel, "You cannot remove that role");
    }

    const membersWithTheRole = members.filter(m => m.roles.includes(roleId));
    let assigned = 0;
    const failed = [];
    const didNotHaveRole = members.length - membersWithTheRole.length;

    msg.channel.createMessage(
      `Removing role **${role.name}** from ${membersWithTheRole.length} ${
        membersWithTheRole.length === 1 ? "member" : "members"
      }...`,
    );

    for (const member of membersWithTheRole) {
      try {
        this.logs.ignoreLog(LogType.MEMBER_ROLE_REMOVE, member.id);
        await member.removeRole(roleId);
        this.logs.log(LogType.MEMBER_ROLE_REMOVE, {
          member: stripObjectToScalars(member, ["user", "roles"]),
          roles: role.name,
          mod: stripObjectToScalars(msg.author),
        });
        assigned++;
      } catch (e) {
        logger.warn(`Error when removing role via !massremoverole: ${e.message}`);
        failed.push(member.id);
      }
    }

    let resultMessage = `Removed role **${role.name}** from  ${assigned} ${assigned === 1 ? "member" : "members"}!`;
    if (didNotHaveRole) {
      resultMessage += ` ${didNotHaveRole} ${didNotHaveRole === 1 ? "member" : "members"} didn't have the role.`;
    }

    if (failed.length) {
      resultMessage += `\nFailed to remove the role from the following members: ${failed.join(", ")}`;
    }

    if (unknownMembers.length) {
      resultMessage += `\nUnknown members: ${unknownMembers.join(", ")}`;
    }

    msg.channel.createMessage(successMessage(resultMessage));
  }
}
