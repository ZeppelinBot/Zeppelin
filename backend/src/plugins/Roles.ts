import { ZeppelinPlugin, trimPluginDescription } from "./ZeppelinPlugin";
import * as t from "io-ts";
import { stripObjectToScalars, tNullable } from "../utils";
import { decorators as d, IPluginOptions, logger, waitForReaction, waitForReply } from "knub";
import { Attachment, Constants as ErisConstants, Guild, GuildChannel, Member, Message, TextChannel, User } from "eris";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";

const ConfigSchema = t.type({
  can_assign: t.boolean,
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
        assignable_roles: [],
      },
      overrides: [
        {
          level: ">=50",
          config: {
            can_assign: true,
          },
        },
      ],
    };
  }

  @d.command("addrole", "<member:member> [role:string$]", {
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

  @d.command("removerole", "<member:member> [role:string$]", {
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
}
