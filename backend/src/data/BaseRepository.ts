export class BaseRepository {
  private nextRelations: string[];

  constructor() {
    this.nextRelations = [];
  }

  /**
   * Primes the specified relation(s) to be used in the next database operation.
   * Can be chained.
   */
  public with(relations: string | string[]): this {
    if (Array.isArray(relations)) {
      this.nextRelations.push(...relations);
    } else {
      this.nextRelations.push(relations);
    }

    return this;
  }

  /**
   * Gets and resets the relations primed using with()
   */
  protected getRelations(): string[] {
    const relations = this.nextRelations || [];
    this.nextRelations = [];
    return relations;
  }
}
