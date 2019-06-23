import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { AllowedGuilds } from "../data/AllowedGuilds";
import { MINUTES } from "../utils";

export class GuildInfoSaverPlugin extends ZeppelinPlugin {
  public static pluginName = "guild_info_saver";
  protected allowedGuilds: AllowedGuilds;
  private updateInterval;

  onLoad() {
    this.allowedGuilds = new AllowedGuilds();

    this.updateGuildInfo();
    this.updateInterval = setInterval(() => this.updateGuildInfo(), 60 * MINUTES);
  }

  onUnload() {
    clearInterval(this.updateInterval);
  }

  protected updateGuildInfo() {
    this.allowedGuilds.updateInfo(this.guildId, this.guild.name, this.guild.iconURL);
  }
}
