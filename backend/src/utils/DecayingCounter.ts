/**
 * This is not related to Zeppelin's counters feature
 */
export class DecayingCounter {
  protected value = 0;

  constructor(protected decayInterval: number) {
    setInterval(() => {
      this.value = Math.max(0, this.value - 1);
    }, decayInterval);
  }

  add(count = 1): number {
    this.value += count;
    return this.value;
  }

  get(): number {
    return this.value;
  }
}
