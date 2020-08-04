import { RegExpWorker, TimeoutError } from "regexp-worker";
import { CooldownManager } from "knub";
import { MINUTES } from "./utils";
import { EventEmitter } from "events";

const isTimeoutError = (a): a is TimeoutError => {
  return a.message != null && a.elapsedTimeMs != null;
};

export class RegExpTimeoutError extends Error {
  constructor(message: string, public elapsedTimeMs: number) {
    super(message);
  }
}

export function allowTimeout(err: RegExpTimeoutError | Error) {
  if (err instanceof RegExpTimeoutError) {
    return null;
  }

  throw err;
}

const REGEX_TIMEOUT = 100; // ms

const REGEX_FAIL_TO_COOLDOWN_COUNT = 3; // If a regex fails this many times, it goes on cooldown...
const REGEX_FAIL_COOLDOWN = 5 * MINUTES; // ...for this long

export interface RegExpRunner {
  on(event: "timeout", listener: (regexSource: string, timeoutMs: number) => void);
  on(event: "repeatedTimeout", listener: (regexSource: string, timeoutMs: number, failTimes: number) => void);
}

/**
 * Leverages RegExpWorker to run regular expressions in worker threads with a timeout.
 * Repeatedly failing regexes are put on a cooldown where requests to execute them are ignored.
 */
export class RegExpRunner extends EventEmitter {
  private _worker: RegExpWorker;

  private cooldown: CooldownManager;
  private failedTimes: Map<string, number>;

  constructor() {
    super();
    this.cooldown = new CooldownManager();
    this.failedTimes = new Map();
  }

  private get worker(): RegExpWorker {
    if (!this._worker) {
      this._worker = new RegExpWorker(REGEX_TIMEOUT);
    }

    return this._worker;
  }

  public async exec(regex: RegExp, str: string): Promise<null | RegExpExecArray[]> {
    if (this.cooldown.isOnCooldown(regex.source)) {
      return null;
    }

    try {
      const result = await this.worker.execRegExp(regex, str);
      return result.matches.length || regex.global ? result.matches : null;
    } catch (e) {
      if (isTimeoutError(e)) {
        if (this.failedTimes.has(regex.source)) {
          // Regex has failed before, increment fail counter
          this.failedTimes.set(regex.source, this.failedTimes.get(regex.source) + 1);
        } else {
          // This is the first time this regex failed, init fail counter
          this.failedTimes.set(regex.source, 1);
        }

        if (this.failedTimes.get(regex.source) >= REGEX_FAIL_TO_COOLDOWN_COUNT) {
          // Regex has failed too many times, set it on cooldown
          this.cooldown.setCooldown(regex.source, REGEX_FAIL_COOLDOWN);
          this.failedTimes.delete(regex.source);
          this.emit("repeatedTimeout", regex.source, REGEX_TIMEOUT, REGEX_FAIL_TO_COOLDOWN_COUNT);
        }

        this.emit("timeout", regex.source, REGEX_TIMEOUT);

        throw new RegExpTimeoutError(e.message, e.elapsedTimeMs);
      }

      throw e;
    }
  }

  public async dispose() {
    await this.worker.dispose();
    this._worker = null;
  }
}
