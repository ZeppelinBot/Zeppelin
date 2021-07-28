import util from "util";

export class DiscordJSError extends Error {
  code: number | string | undefined;
  shardId: number;

  constructor(message: string, code: number | string | undefined, shardId: number) {
    super(message);
    this.code = code;
    this.shardId = shardId;
  }

  [util.inspect.custom]() {
    return `[DISCORDJS] [ERROR CODE ${this.code ?? "?"}] [SHARD ${this.shardId}] ${this.message}`;
  }
}
