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

  @d.event("userUpdate")
  async onUserUpdate(user: User, oldUser: { username: string; discriminator: string; avatar: string }) {
    console.log("onUserUpdate", user.username, oldUser.username);
    if (user.username !== oldUser.username || user.discriminator !== oldUser.discriminator) {
      const newUsername = `${user.username}#${user.discriminator}`;
      await this.nameHistory.addEntry(user.id, NameHistoryEntryTypes.Username, newUsername);
    }
  }

  @d.event("presenceUpdate")
  async onPresenceUpdate(other: Member | Relationship) {
    const user = other.user;
    const username = `${user.username}#${user.discriminator}`;

    const lastEntry = await this.nameHistory.getLastEntryByType(user.id, NameHistoryEntryTypes.Username);
    if (!lastEntry || lastEntry.value !== username) {
      await this.nameHistory.addEntry(user.id, NameHistoryEntryTypes.Username, username);
    }
  }

  @d.event("guildMemberUpdate")
  async onGuildMemberUpdate(_, member: Member, oldMember: { nick: string; roles: string[] }) {
    if (member.nick !== oldMember.nick) {
      await this.nameHistory.addEntry(member.id, NameHistoryEntryTypes.Nickname, member.nick);
    }
  }
}
