import { Snowflake } from "discord-api-types";
import { GuildPluginData } from "knub";
import moment from "moment";
import { Mute } from "src/data/entities/Mute";
import { Tempban } from "src/data/entities/Tempban";
import { ModActionsPluginType } from "src/plugins/ModActions/types";
import { MutesPluginType } from "src/plugins/Mutes/types";
import { RemindersPluginType } from "src/plugins/Reminders/types";

type TimerCallback = (key: string, expiry: number) => void;

type TimerOptions = {
  key: Snowflake;
  guildId?: Snowflake;
  expiry: number;
  plugin?: string;
  callback: TimerCallback;
};

export class ExpiringTimer {
  done: boolean = false;
  options: TimerOptions;
  timeout?: NodeJS.Timeout;
  data?: any; // idk how to make this take generic <T> typings data
  isValid() {
    return !this.done;
  }
  private execute() {
    if (!this.isValid()) return;
    this.options.callback(this.options.key, this.options.expiry);
    this.done = true;
  }
  init() {
    if (this.timeout) this.clear();
    this.timeout = setTimeout(() => this.execute(), this.options.expiry);
  }
  clear() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
  }
  constructor(options: TimerOptions) {
    this.options = options;
    this.init();
  }
}

export function addTimer(
  pluginData: GuildPluginData<MutesPluginType | ModActionsPluginType>,
  obj: Mute | Tempban,
  callback: () => void,
) {
  const existing = pluginData.state.timers.find(
    (tm) => tm.options.key === obj.user_id && tm.options.guildId === obj.guild_id && !tm.done,
  ); // for future-proof when you do global events
  if (!existing && obj.expires_at) {
    const exp = moment(obj.expires_at!).toDate().getTime() - moment.utc().toDate().getTime();
    const newTimer = new ExpiringTimer({
      key: obj.user_id,
      guildId: obj.guild_id,
      plugin: "mutes",
      expiry: exp,
      callback,
    });
    pluginData.state.timers.push(newTimer);
  }
}

export function removeTimer(pluginData: GuildPluginData<MutesPluginType | ModActionsPluginType>, obj: Mute | Tempban) {
  const existing = pluginData.state.timers.findIndex(
    (tm) => tm.options.key === obj.user_id && tm.options.guildId === obj.guild_id && !tm.done,
  );
  if (existing) {
    const tm = pluginData.state.timers[existing];
    tm.clear();
    tm.done = true;
    pluginData.state.timers.splice(existing, 1);
  }
}

export function removeTimerByUserId(
  pluginData: GuildPluginData<MutesPluginType | ModActionsPluginType>,
  user_id: Snowflake,
) {
  const existing = pluginData.state.timers.findIndex((tm) => tm.options.key === user_id && !tm.done);
  if (existing) {
    const tm = pluginData.state.timers[existing];
    tm.clear();
    tm.done = true;
    pluginData.state.timers.splice(existing, 1);
  }
}
