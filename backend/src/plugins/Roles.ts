import { trimPluginDescription, ZeppelinPlugin } from "./ZeppelinPlugin";
import * as t from "io-ts";
import { stripObjectToScalars, successMessage } from "../utils";
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

export class RolesPlugin extends ZeppelinPlugin<TConfigSchema> {
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

    this.sendSuccessMessage(msg.channel, "Role added to user!");
  }

  @d.command("massaddrole", "<role:string> <members:member...>")
  @d.permission("can_mass_assign")
  async massAddRoleCmd(msg: Message, args: { role: string; members: Member[] }) {
    for (const member of args.members) {
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
    const role = this.guild.roles.get(roleId);

    const config = this.getConfigForMsg(msg);
    if (!config.assignable_roles.includes(roleId)) {
      return this.sendErrorMessage(msg.channel, "You cannot assign that role");
    }

    const membersWithoutTheRole = args.members.filter(m => !m.roles.includes(roleId));
    let assigned = 0;
    let failed = 0;
    const alreadyHadRole = args.members.length - membersWithoutTheRole.length;

    msg.channel.createMessage(`Adding role to specified members...`);

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
        failed++;
      }
    }

    let resultMessage = `Role added to ${assigned} ${assigned === 1 ? "member" : "members"}!`;
    if (failed > 0) {
      resultMessage += ` Failed to add the role to ${failed} ${failed === 1 ? "member" : "members"}.`;
    }
    if (alreadyHadRole) {
      resultMessage += ` ${alreadyHadRole} ${alreadyHadRole === 1 ? "member" : "members"} already had the role.`;
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

    this.sendSuccessMessage(msg.channel, "Role removed from user!");
  }

  @d.command("massremoverole", "<role:string> <members:member...>")
  @d.permission("can_mass_assign")
  async massRemoveRoleCmd(msg: Message, args: { role: string; members: Member[] }) {
    for (const member of args.members) {
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
    const role = this.guild.roles.get(roleId);

    const config = this.getConfigForMsg(msg);
    if (!config.assignable_roles.includes(roleId)) {
      return this.sendErrorMessage(msg.channel, "You cannot remove that role");
    }

    const membersWithTheRole = args.members.filter(m => m.roles.includes(roleId));
    let assigned = 0;
    let failed = 0;
    const didNotHaveRole = args.members.length - membersWithTheRole.length;

    msg.channel.createMessage(`Removing role from specified members...`);

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
        failed++;
      }
    }

    let resultMessage = `Role removed from  ${assigned} ${assigned === 1 ? "member" : "members"}!`;
    if (failed > 0) {
      resultMessage += ` Failed to remove the role from  ${failed} ${failed === 1 ? "member" : "members"}.`;
    }
    if (didNotHaveRole) {
      resultMessage += ` ${didNotHaveRole} ${didNotHaveRole === 1 ? "member" : "members"} didn't have the role.`;
    }

    msg.channel.createMessage(successMessage(resultMessage));
  }
}
