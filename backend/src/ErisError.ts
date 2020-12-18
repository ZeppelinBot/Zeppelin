export class ErisError extends Error {
  code: number | string | undefined;
  shardId: number;

  constructor(message: string, code: number | string | undefined, shardId: number) {
    super(message);
    this.code = code;
    this.shardId = shardId;
  }

  toString() {
    return `[ERIS] [CODE ${this.code || "?"}] [SHARD ${this.shardId}] ${this.message}`;
  }
}
