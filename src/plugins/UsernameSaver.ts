import { decorators as d, GlobalPlugin } from "knub";
import { UsernameHistory } from "../data/UsernameHistory";
import { Member, User } from "eris";
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

  @d.event("userUpdate", null, false)
  async onUserUpdate(user: User) {
    this.updateUsername(user);
  }

  @d.event("guildMemberAdd", null, false)
  async onGuildMemberAdd(_, member: Member) {
    this.updateUsername(member.user);
  }
}
