import { Plugin, decorators as d } from "knub";
import { GuildNameHistory } from "../data/GuildNameHistory";
import { Member, Message, Relationship, User } from "eris";
import { NameHistoryEntryTypes } from "../data/NameHistoryEntryTypes";
import { createChunkedMessage, errorMessage, trimLines } from "../utils";

export class NameHistoryPlugin extends Plugin {
  public static pluginName = "name_history";

  protected nameHistory: GuildNameHistory;

  getDefaultOptions() {
    return {
      permissions: {
        view: false
      },

      overrides: [
        {
          level: ">=50",
          permissions: {
            view: true
          }
        }
      ]
    };
  }

  onLoad() {
    this.nameHistory = GuildNameHistory.getInstance(this.guildId);
  }

  @d.command("names", "<userId:userId>")
  @d.permission("view")
  async namesCmd(msg: Message, args: { userId: string }) {
    const names = await this.nameHistory.getByUserId(args.userId);
    if (!names) {
      msg.channel.createMessage(errorMessage("No name history found for that user!"));
      return;
    }

    const rows = names.map(entry => {
      const type = entry.type === NameHistoryEntryTypes.Username ? "Username" : "Nickname";
      const value = entry.value || "<none>";
      return `\`[${entry.timestamp}]\` ${type} **${value}**`;
    });

    const user = this.bot.users.get(args.userId);
    const currentUsername = user ? `${user.username}#${user.discriminator}` : args.userId;

    const message = trimLines(`
      Name history for **${currentUsername}**:
      
      ${rows.join("\n")}
    `);
    createChunkedMessage(msg.channel, message);
  }

  @d.event("userUpdate", null, false)
  async onUserUpdate(user: User, oldUser: { username: string; discriminator: string; avatar: string }) {
    if (user.username !== oldUser.username || user.discriminator !== oldUser.discriminator) {
      const newUsername = `${user.username}#${user.discriminator}`;
      await this.nameHistory.addEntry(user.id, NameHistoryEntryTypes.Username, newUsername);
    }
  }

  @d.event("guildMemberUpdate")
  async onGuildMemberUpdate(_, member: Member) {
    const latestEntry = await this.nameHistory.getLastEntryByType(member.id, NameHistoryEntryTypes.Nickname);
    if (!latestEntry || latestEntry.value !== member.nick) {
      await this.nameHistory.addEntry(member.id, NameHistoryEntryTypes.Nickname, member.nick);
    }
  }

  @d.event("guildMemberAdd")
  async onGuildMemberAdd(_, member: Member) {
    const latestEntry = await this.nameHistory.getLastEntryByType(member.id, NameHistoryEntryTypes.Username);
    const username = `${member.user.username}#${member.user.discriminator}`;
    if (!latestEntry || latestEntry.value !== username) {
      await this.nameHistory.addEntry(member.id, NameHistoryEntryTypes.Username, username);
    }
  }
}
