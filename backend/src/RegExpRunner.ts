import { EventEmitter } from "events";
import { CooldownManager } from "knub";
import { RegExpWorker, TimeoutError } from "regexp-worker";
import { MINUTES, SECONDS } from "./utils";
import Timeout = NodeJS.Timeout;

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

// Regex timeout starts at a higher value while the bot loads initially, and gets lowered afterwards
const INITIAL_REGEX_TIMEOUT = 5 * SECONDS;
const INITIAL_REGEX_TIMEOUT_DURATION = 30 * SECONDS;
const FINAL_REGEX_TIMEOUT = 5 * SECONDS;

const regexTimeoutUpgradePromise = new Promise(resolve => setTimeout(resolve, INITIAL_REGEX_TIMEOUT_DURATION));

let newWorkerTimeout = INITIAL_REGEX_TIMEOUT;
regexTimeoutUpgradePromise.then(() => (newWorkerTimeout = FINAL_REGEX_TIMEOUT));

const REGEX_FAIL_TO_COOLDOWN_COUNT = 5; // If a regex times out this many times...
const REGEX_FAIL_DECAY_TIME = 2 * MINUTES; // ...in this interval...
const REGEX_FAIL_COOLDOWN = 2 * MINUTES + 30 * SECONDS; // ...it goes on cooldown for this long

export interface RegExpRunner {
  on(event: "timeout", listener: (regexSource: string, timeoutMs: number) => void);
  on(event: "repeatedTimeout", listener: (regexSource: string, timeoutMs: number, failTimes: number) => void);
}

/**
 * Leverages RegExpWorker to run regular expressions in worker threads with a timeout.
 * Repeatedly failing regexes are put on a cooldown where requests to execute them are ignored.
 */
export class RegExpRunner extends EventEmitter {
  private _worker: RegExpWorker | null;
  private readonly _failedTimesInterval: Timeout;

  private cooldown: CooldownManager;
  private failedTimes: Map<string, number>;

  constructor() {
    super();
    this.cooldown = new CooldownManager();
    this.failedTimes = new Map();
    this._failedTimesInterval = setInterval(() => {
      for (const [pattern, times] of this.failedTimes.entries()) {
        this.failedTimes.set(pattern, times - 1);
      }
    }, REGEX_FAIL_DECAY_TIME);
  }

  private get worker(): RegExpWorker {
    if (!this._worker) {
      this._worker = new RegExpWorker(newWorkerTimeout);
      if (newWorkerTimeout !== FINAL_REGEX_TIMEOUT) {
        regexTimeoutUpgradePromise.then(() => {
          if (!this._worker) return;
          this._worker.timeout = FINAL_REGEX_TIMEOUT;
        });
      }
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
          this.failedTimes.set(regex.source, this.failedTimes.get(regex.source)! + 1);
        } else {
          // This is the first time this regex failed, init fail counter
          this.failedTimes.set(regex.source, 1);
        }

        if (this.failedTimes.has(regex.source) && this.failedTimes.get(regex.source)! >= REGEX_FAIL_TO_COOLDOWN_COUNT) {
          // Regex has failed too many times, set it on cooldown
          this.cooldown.setCooldown(regex.source, REGEX_FAIL_COOLDOWN);
          this.failedTimes.delete(regex.source);
          this.emit("repeatedTimeout", regex.source, this.worker.timeout, REGEX_FAIL_TO_COOLDOWN_COUNT);
        }

        this.emit("timeout", regex.source, this.worker.timeout);

        throw new RegExpTimeoutError(e.message, e.elapsedTimeMs);
      }

      throw e;
    }
  }

  public async dispose() {
    await this.worker.dispose();
    this._worker = null;
    clearInterval(this._failedTimesInterval);
  }
}
