import { Queue } from "./Queue";

type Listener = (...args: any[]) => void;

export class QueuedEventEmitter {
  protected listeners: Map<string, Listener[]>;
  protected queue: Queue;

  constructor() {
    this.listeners = new Map();
    this.queue = new Queue();
  }

  on(eventName: string, listener: Listener) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }

    this.listeners.get(eventName).push(listener);
  }

  off(eventName: string, listener: Listener) {
    if (!this.listeners.has(eventName)) {
      return;
    }

    const listeners = this.listeners.get(eventName);
    listeners.splice(listeners.indexOf(listener), 1);
  }

  emit(eventName: string, args: any[] = []) {
    const listeners = [...(this.listeners.get(eventName) || []), ...(this.listeners.get("*") || [])];

    listeners.forEach(listener => {
      this.queue.add(listener.bind(null, args));
    });
  }
}
