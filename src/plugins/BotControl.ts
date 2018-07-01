import { decorators as d, GlobalPlugin } from "knub";
import * as child_process from "child_process";
import { Message } from "eris";

/**
 * A global plugin that allows bot owners to control the bot
 */
export class BotControlPlugin extends GlobalPlugin {
  getDefaultOptions() {
    return {
      config: {
        owners: []
      }
    };
  }

  isOwner(userId) {
    return this.configValue("owners").includes(userId);
  }

  @d.command("bot_update")
  async updateCmd(msg: Message) {
    if (!this.isOwner(msg.author.id)) return;

    const updateCmd = this.configValue("update_cmd");
    if (!updateCmd) {
      msg.channel.createMessage("Update command not specified!");
      return;
    }

    msg.channel.createMessage("Updating...");
    const updater = child_process.exec(updateCmd, { cwd: process.cwd() });
    updater.stderr.on("data", data => {
      // tslint:disable-next-line
      console.error(data);
    });
  }

  @d.command("bot_reload")
  async reloadCmd(msg: Message) {
    if (!this.isOwner(msg.author.id)) return;

    msg.channel.createMessage("Reloading...");
    this.knub.reloadGuild(this.guildId);
  }
}
