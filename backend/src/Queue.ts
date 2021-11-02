import { SECONDS } from "./utils";

type InternalQueueFn = () => Promise<void>;
type AnyFn = (...args: any[]) => any;

const DEFAULT_TIMEOUT = 10 * SECONDS;

export class Queue<TQueueFunction extends AnyFn = AnyFn> {
  protected running = false;
  protected queue: InternalQueueFn[] = [];
  protected _timeout: number;

  constructor(timeout = DEFAULT_TIMEOUT) {
    this._timeout = timeout;
  }

  get timeout(): number {
    return this._timeout;
  }

  /**
   * The number of operations that are currently queued up or running.
   * I.e. backlog (queue) + current running process, if any.
   *
   * If this is 0, queueing a function will run it as soon as possible.
   */
  get length(): number {
    return this.queue.length + (this.running ? 1 : 0);
  }

  public add(fn: TQueueFunction): Promise<any> {
    const promise = new Promise<any>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });

      if (!this.running) this.next();
    });

    return promise;
  }

  public next(): void {
    this.running = true;

    if (this.queue.length === 0) {
      this.running = false;
      return;
    }

    const fn = this.queue.shift()!;
    new Promise((resolve) => {
      // Either fn() completes or the timeout is reached
      void fn().then(resolve);
      setTimeout(resolve, this._timeout);
    }).then(() => this.next());
  }

  public clear() {
    this.queue.splice(0, this.queue.length);
  }
}
