import { Plugin, decorators as d } from "knub";
import { SavedMessage } from "../data/entities/SavedMessage";
import { Message, Role, TextableChannel, User } from "eris";
import { GuildPingableRoles } from "../data/GuildPingableRoles";
import { PingableRole } from "../data/entities/PingableRole";
import { errorMessage, successMessage } from "../utils";

const TIMEOUT = 10 * 1000;

export class PingableRoles extends Plugin {
  public static pluginName = "pingable_roles";

  protected pingableRoles: GuildPingableRoles;
  protected cache: Map<string, PingableRole[]>;
  protected timeouts: Map<string, any>;

  getDefaultOptions() {
    return {
      permissions: {
        use: false,
      },

      overrides: [
        {
          level: ">=100",
          permissions: {
            use: true,
          },
        },
      ],
    };
  }

  onLoad() {
    this.pingableRoles = GuildPingableRoles.getInstance(this.guildId);

    this.cache = new Map();
    this.timeouts = new Map();
  }

  protected async getPingableRolesForChannel(channelId: string): Promise<PingableRole[]> {
    if (!this.cache.has(channelId)) {
      this.cache.set(channelId, await this.pingableRoles.getForChannel(channelId));
    }

    return this.cache.get(channelId);
  }

  @d.command("pingable_role disable", "<channelId:channelId> <role:role>")
  @d.permission("use")
  async disablePingableRoleCmd(msg: Message, args: { channelId: string; role: Role }) {
    const pingableRole = await this.pingableRoles.getByChannelAndRoleId(args.channelId, args.role.id);
    if (!pingableRole) {
      msg.channel.createMessage(errorMessage(`**${args.role.name}** is not set as pingable in <#${args.channelId}>`));
      return;
    }

    await this.pingableRoles.delete(args.channelId, args.role.id);
    this.cache.delete(args.channelId);

    msg.channel.createMessage(
      successMessage(`**${args.role.name}** is no longer set as pingable in <#${args.channelId}>`),
    );
  }

  @d.command("pingable_role", "<channelId:channelId> <role:role>")
  @d.permission("use")
  async setPingableRoleCmd(msg: Message, args: { channelId: string; role: Role }) {
    const existingPingableRole = await this.pingableRoles.getByChannelAndRoleId(args.channelId, args.role.id);
    if (existingPingableRole) {
      msg.channel.createMessage(
        errorMessage(`**${args.role.name}** is already set as pingable in <#${args.channelId}>`),
      );
      return;
    }

    await this.pingableRoles.add(args.channelId, args.role.id);
    this.cache.delete(args.channelId);

    msg.channel.createMessage(successMessage(`**${args.role.name}** has been set as pingable in <#${args.channelId}>`));
  }

  @d.event("typingStart")
  async onTypingStart(channel: TextableChannel, user: User) {
    const pingableRoles = await this.getPingableRolesForChannel(channel.id);
    if (pingableRoles.length === 0) return;

    if (this.timeouts.has(channel.id)) {
      clearTimeout(this.timeouts.get(channel.id));
    }

    this.enablePingableRoles(pingableRoles);

    const timeout = setTimeout(() => {
      this.disablePingableRoles(pingableRoles);
    }, TIMEOUT);
    this.timeouts.set(channel.id, timeout);
  }

  @d.event("messageCreate")
  async onMessageCreate(msg: Message) {
    const pingableRoles = await this.getPingableRolesForChannel(msg.channel.id);
    if (pingableRoles.length === 0) return;

    if (this.timeouts.has(msg.channel.id)) {
      clearTimeout(this.timeouts.get(msg.channel.id));
    }

    this.disablePingableRoles(pingableRoles);
  }

  protected enablePingableRoles(pingableRoles: PingableRole[]) {
    for (const pingableRole of pingableRoles) {
      const role = this.guild.roles.get(pingableRole.role_id);
      if (!role) continue;

      role.edit(
        {
          mentionable: true,
        },
        "Enable pingable role",
      );
    }
  }

  protected disablePingableRoles(pingableRoles: PingableRole[]) {
    for (const pingableRole of pingableRoles) {
      const role = this.guild.roles.get(pingableRole.role_id);
      if (!role) continue;

      role.edit(
        {
          mentionable: false,
        },
        "Disable pingable role",
      );
    }
  }
}
