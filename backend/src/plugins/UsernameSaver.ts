import { decorators as d, GlobalPlugin } from "knub";
import { UsernameHistory } from "../data/UsernameHistory";
import { Member, Message, User } from "eris";
import { GlobalZeppelinPlugin } from "./GlobalZeppelinPlugin";

export class UsernameSaver extends GlobalZeppelinPlugin {
  public static pluginName = "username_saver";

  protected usernameHistory: UsernameHistory;

  async onLoad() {
    this.usernameHistory = new UsernameHistory();
  }

  protected async updateUsername(user: User) {
    if (!user) return;
    const newUsername = `${user.username}#${user.discriminator}`;
    const latestEntry = await this.usernameHistory.getLastEntry(user.id);
    if (!latestEntry || newUsername !== latestEntry.username) {
      await this.usernameHistory.addEntry(user.id, newUsername);
    }
  }

  @d.event("messageCreate")
  async onMessage(msg: Message) {
    if (msg.author.bot) return;
    this.updateUsername(msg.author);
  }

  @d.event("voiceChannelJoin")
  async onVoiceChannelJoin(member: Member) {
    if (member.user.bot) return;
    this.updateUsername(member.user);
  }
}
