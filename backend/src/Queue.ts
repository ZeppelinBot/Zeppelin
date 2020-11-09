import { SECONDS } from "./utils";

type QueueFn = (...args: any[]) => Promise<any>;

const DEFAULT_TIMEOUT = 10 * SECONDS;

export class Queue {
  protected running: boolean = false;
  protected queue: QueueFn[] = [];
  protected timeout: number;

  constructor(timeout = DEFAULT_TIMEOUT) {
    this.timeout = timeout;
  }

  public add(fn) {
    const promise = new Promise(resolve => {
      this.queue.push(async () => {
        await fn();
        resolve();
      });

      if (!this.running) this.next();
    });

    return promise;
  }

  public next() {
    this.running = true;

    if (this.queue.length === 0) {
      this.running = false;
      return;
    }

    const fn = this.queue.shift()!;
    new Promise(resolve => {
      // Either fn() completes or the timeout is reached
      fn().then(resolve);
      setTimeout(resolve, this.timeout);
    }).then(() => this.next());
  }

  public clear() {
    this.queue.splice(0, this.queue.length);
  }
}
