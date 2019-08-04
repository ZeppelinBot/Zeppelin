import moment from "moment-timezone";
import { ZeppelinPlugin } from "./ZeppelinPlugin";
import { Configs } from "../data/Configs";
import { logger } from "knub";
import { GlobalZeppelinPlugin } from "./GlobalZeppelinPlugin";
import { DBDateFormat } from "../utils";

const CHECK_INTERVAL = 1000;

/**
 * Temporary solution to reloading guilds when their config changes
 * And you know what they say about temporary solutions...
 */
export class GuildConfigReloader extends GlobalZeppelinPlugin {
  public static pluginName = "guild_config_reloader";

  protected guildConfigs: Configs;
  private unloaded = false;
  private highestConfigId;
  private nextCheckTimeout;

  async onLoad() {
    this.guildConfigs = new Configs();

    this.highestConfigId = await this.guildConfigs.getHighestId();
    this.reloadChangedGuilds();
  }

  onUnload() {
    clearTimeout(this.nextCheckTimeout);
    this.unloaded = true;
  }

  protected async reloadChangedGuilds() {
    if (this.unloaded) return;

    const changedConfigs = await this.guildConfigs.getActiveLargerThanId(this.highestConfigId);
    for (const item of changedConfigs) {
      if (!item.key.startsWith("guild-")) continue;

      const guildId = item.key.slice("guild-".length);
      logger.info(`Config changed, reloading guild ${guildId}`);
      await this.knub.reloadGuild(guildId);

      if (item.id > this.highestConfigId) {
        this.highestConfigId = item.id;
      }
    }

    this.nextCheckTimeout = setTimeout(() => this.reloadChangedGuilds(), CHECK_INTERVAL);
  }
}
