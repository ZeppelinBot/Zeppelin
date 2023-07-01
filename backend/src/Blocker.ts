export type Block = {
  count: number;
  unblock: () => void;
  getPromise: () => Promise<void>;
};

export class Blocker {
  #blocks: Map<string, Block> = new Map();

  block(key: string): void {
    if (!this.#blocks.has(key)) {
      const promise = new Promise<void>((resolve) => {
        this.#blocks.set(key, {
          count: 0, // Incremented to 1 further below
          unblock() {
            this.count--;
            if (this.count === 0) {
              resolve();
            }
          },
          getPromise: () => promise, // :d
        });
      });
    }
    this.#blocks.get(key)!.count++;
  }

  unblock(key: string): void {
    if (this.#blocks.has(key)) {
      this.#blocks.get(key)!.unblock();
    }
  }

  async waitToBeUnblocked(key: string): Promise<void> {
    if (!this.#blocks.has(key)) {
      return;
    }
    await this.#blocks.get(key)!.getPromise();
  }
}
