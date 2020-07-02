import { decorators as d, IPluginOptions } from "knub";
import { GuildNicknameHistory, MAX_NICKNAME_ENTRIES_PER_USER } from "../data/GuildNicknameHistory";
import { Member, Message } from "eris";
import { ZeppelinPluginClass } from "./ZeppelinPluginClass";
import { createChunkedMessage, DAYS, disableCodeBlocks } from "../utils";
import { MAX_USERNAME_ENTRIES_PER_USER, UsernameHistory } from "../data/UsernameHistory";
import * as t from "io-ts";
import { NICKNAME_RETENTION_PERIOD } from "../data/cleanup/nicknames";
import moment from "moment-timezone";
import { USERNAME_RETENTION_PERIOD } from "../data/cleanup/usernames";
import { Queue } from "../Queue";

const ConfigSchema = t.type({
  can_view: t.boolean,
});
type TConfigSchema = t.TypeOf<typeof ConfigSchema>;

export class NameHistoryPlugin extends ZeppelinPluginClass<TConfigSchema> {
  public static pluginName = "name_history";
  public static showInDocs = false;
  public static configSchema = ConfigSchema;

  protected nicknameHistory: GuildNicknameHistory;
  protected usernameHistory: UsernameHistory;

  protected updateQueue: Queue;

  public static getStaticDefaultOptions(): IPluginOptions<TConfigSchema> {
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
    this.nicknameHistory = GuildNicknameHistory.getGuildInstance(this.guildId);
    this.usernameHistory = new UsernameHistory();
    this.updateQueue = new Queue();
  }

  @d.command("names", "<userId:userId>")
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

    const nicknameDays = Math.round(NICKNAME_RETENTION_PERIOD / DAYS);
    const usernameDays = Math.round(USERNAME_RETENTION_PERIOD / DAYS);

    let message = `Name history for **${currentUsername}**:`;
    if (nicknameRows.length) {
      message += `\n\n__Last ${MAX_NICKNAME_ENTRIES_PER_USER} nicknames within ${nicknameDays} days:__\n${nicknameRows.join(
        "\n",
      )}`;
    }
    if (usernameRows.length) {
      message += `\n\n__Last ${MAX_USERNAME_ENTRIES_PER_USER} usernames within ${usernameDays} days:__\n${usernameRows.join(
        "\n",
      )}`;
    }

    createChunkedMessage(msg.channel, message);
  }

  async updateNickname(member: Member) {
    if (!member) return;
    const latestEntry = await this.nicknameHistory.getLastEntry(member.id);
    if (!latestEntry || latestEntry.nickname !== member.nick) {
      if (!latestEntry && member.nick == null) return; // No need to save "no nickname" if there's no previous data
      await this.nicknameHistory.addEntry(member.id, member.nick);
    }
  }

  @d.event("messageCreate")
  async onMessage(msg: Message) {
    this.updateQueue.add(() => this.updateNickname(msg.member));
  }

  @d.event("voiceChannelJoin")
  async onVoiceChannelJoin(member: Member) {
    this.updateQueue.add(() => this.updateNickname(member));
  }
}
