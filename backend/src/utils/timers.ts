import { Snowflake } from "discord-api-types";

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
