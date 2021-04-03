import { Queue } from "./Queue";

type Listener = (...args: any[]) => void;

export class QueuedEventEmitter {
  protected listeners: Map<string, Listener[]>;
  protected queue: Queue;

  constructor() {
    this.listeners = new Map();
    this.queue = new Queue();
  }

  on(eventName: string, listener: Listener): Listener {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }

    this.listeners.get(eventName)!.push(listener);
    return listener;
  }

  off(eventName: string, listener: Listener) {
    if (!this.listeners.has(eventName)) {
      return;
    }

    const listeners = this.listeners.get(eventName)!;
    listeners.splice(listeners.indexOf(listener), 1);
  }

  once(eventName: string, listener: Listener): Listener {
    const handler = this.on(eventName, (...args) => {
      const result = listener(...args);
      this.off(eventName, handler);
      return result;
    });
    return handler;
  }

  emit(eventName: string, args: any[] = []): Promise<void> {
    const listeners = [...(this.listeners.get(eventName) || []), ...(this.listeners.get("*") || [])];

    let promise: Promise<any> = Promise.resolve();
    listeners.forEach((listener) => {
      promise = this.queue.add(listener.bind(null, ...args));
    });

    return promise;
  }
}
