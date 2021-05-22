import { SECONDS } from "./utils";

type InternalQueueFn = () => Promise<void>;
type AnyFn = (...args: any[]) => any;

const DEFAULT_TIMEOUT = 10 * SECONDS;

export class Queue<TQueueFunction extends AnyFn = AnyFn> {
  protected running = false;
  protected queue: InternalQueueFn[] = [];
  protected timeout: number;

  constructor(timeout = DEFAULT_TIMEOUT) {
    this.timeout = timeout;
  }

  public add(fn: TQueueFunction): Promise<void> {
    const promise = new Promise<void>(resolve => {
      this.queue.push(async () => {
        await fn();
        resolve();
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
    new Promise(resolve => {
      // Either fn() completes or the timeout is reached
      void fn().then(resolve);
      setTimeout(resolve, this.timeout);
    }).then(() => this.next());
  }

  public clear() {
    this.queue.splice(0, this.queue.length);
  }
}
