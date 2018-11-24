type QueueFn = (...args: any[]) => Promise<any>;

export class Queue {
  protected running: boolean = false;
  protected queue: QueueFn[] = [];
  protected timeout: number = 10 * 1000;

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

    const fn = this.queue.shift();
    new Promise(resolve => {
      // Either fn() completes or the timeout is reached
      fn().then(resolve);
      setTimeout(resolve, this.timeout);
    }).then(() => this.next());
  }
}
