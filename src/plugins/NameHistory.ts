import { decorators as d, IPluginOptions } from "knub";
import { GuildNicknameHistory, MAX_NICKNAME_ENTRIES_PER_USER } from "../data/GuildNicknameHistory";
import { Member, Message } from "eris";
import { createChunkedMessage, disableCodeBlocks } from "../utils";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { MAX_USERNAME_ENTRIES_PER_USER, UsernameHistory } from "../data/UsernameHistory";

interface INameHistoryPluginConfig {
  can_view: boolean;
}

export class NameHistoryPlugin extends ZeppelinPlugin<INameHistoryPluginConfig> {
  public static pluginName = "name_history";

  protected nicknameHistory: GuildNicknameHistory;
  protected usernameHistory: UsernameHistory;

  getDefaultOptions(): IPluginOptions<INameHistoryPluginConfig> {
    return {
      config: {
        can_view: false,
      },

      overrides: [
        {
          level: ">=50",
          config: {
            can_view: true,
          },
        },
      ],
    };
  }

  onLoad() {
    this.nicknameHistory = GuildNicknameHistory.getInstance(this.guildId);
    this.usernameHistory = UsernameHistory.getInstance(null);
  }

  @d.command("names", "<userId:userid>")
  @d.permission("can_view")
  async namesCmd(msg: Message, args: { userId: string }) {
    const nicknames = await this.nicknameHistory.getByUserId(args.userId);
    const usernames = await this.usernameHistory.getByUserId(args.userId);

    if (nicknames.length === 0 && usernames.length === 0) {
      return this.sendErrorMessage(msg.channel, "No name history found");
    }

    const nicknameRows = nicknames.map(
      r => `\`[${r.timestamp}]\` ${r.nickname ? `**${disableCodeBlocks(r.nickname)}**` : "*None*"}`,
    );
    const usernameRows = usernames.map(r => `\`[${r.timestamp}]\` **${disableCodeBlocks(r.username)}**`);

    const user = this.bot.users.get(args.userId);
    const currentUsername = user ? `${user.username}#${user.discriminator}` : args.userId;

    let message = `Name history for **${currentUsername}**:`;
    if (nicknameRows.length) {
      message += `\n\n__Last ${MAX_NICKNAME_ENTRIES_PER_USER} nicknames:__\n${nicknameRows.join("\n")}`;
    }
    if (usernameRows.length) {
      message += `\n\n__Last ${MAX_USERNAME_ENTRIES_PER_USER} usernames:__\n${usernameRows.join("\n")}`;
    }

    createChunkedMessage(msg.channel, message);
  }

  @d.event("guildMemberUpdate")
  async onGuildMemberUpdate(_, member: Member) {
    const latestEntry = await this.nicknameHistory.getLastEntry(member.id);
    if (!latestEntry || latestEntry.nickname != member.nick) {
      // tslint:disable-line
      await this.nicknameHistory.addEntry(member.id, member.nick);
    }
  }
}
