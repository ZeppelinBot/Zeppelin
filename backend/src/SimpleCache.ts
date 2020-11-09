import Timeout = NodeJS.Timeout;

const CLEAN_INTERVAL = 1000;

export class SimpleCache<T = any> {
  protected readonly retentionTime: number;
  protected readonly maxItems: number;

  protected cleanTimeout: Timeout;
  protected unloaded: boolean;

  protected store: Map<string, { remove_at: number; value: T }>;

  constructor(retentionTime: number, maxItems?: number) {
    this.retentionTime = retentionTime;

    if (maxItems) {
      this.maxItems = maxItems;
    }

    this.store = new Map();
  }

  unload() {
    this.unloaded = true;
    clearTimeout(this.cleanTimeout);
  }

  cleanLoop() {
    const now = Date.now();
    for (const [key, info] of this.store.entries()) {
      if (now >= info.remove_at) {
        this.store.delete(key);
      }
    }

    if (!this.unloaded) {
      this.cleanTimeout = setTimeout(() => this.cleanLoop(), CLEAN_INTERVAL);
    }
  }

  set(key: string, value: T) {
    this.store.set(key, {
      remove_at: Date.now() + this.retentionTime,
      value,
    });

    if (this.maxItems && this.store.size > this.maxItems) {
      const keyToDelete = this.store.keys().next().value;
      this.store.delete(keyToDelete);
    }
  }

  get(key: string): T | null {
    const info = this.store.get(key);
    if (!info) return null;

    return info.value;
  }

  has(key: string) {
    return this.store.has(key);
  }

  delete(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}
