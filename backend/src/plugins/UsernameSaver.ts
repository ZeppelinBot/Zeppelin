import { decorators as d, GlobalPlugin } from "knub";
import { UsernameHistory } from "../data/UsernameHistory";
import { Member, Message, User } from "eris";
import { GlobalZeppelinPlugin } from "./GlobalZeppelinPlugin";
import { Queue } from "../Queue";

export class UsernameSaver extends GlobalZeppelinPlugin {
  public static pluginName = "username_saver";

  protected usernameHistory: UsernameHistory;
  protected updateQueue: Queue;

  async onLoad() {
    this.usernameHistory = new UsernameHistory();
    this.updateQueue = new Queue();
  }

  protected async updateUsername(user: User) {
    if (!user) return;
    const newUsername = `${user.username}#${user.discriminator}`;
    const latestEntry = await this.usernameHistory.getLastEntry(user.id);
    if (!latestEntry || newUsername !== latestEntry.username) {
      await this.usernameHistory.addEntry(user.id, newUsername);
    }
  }

  @d.event("messageCreate", null)
  async onMessage(msg: Message) {
    if (msg.author.bot) return;
    this.updateQueue.add(() => this.updateUsername(msg.author));
  }

  @d.event("voiceChannelJoin", null)
  async onVoiceChannelJoin(member: Member) {
    if (member.user.bot) return;
    this.updateQueue.add(() => this.updateUsername(member.user));
  }
}
