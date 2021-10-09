import { asyncMap } from "../utils/async";

export class BaseRepository<TEntity extends unknown = unknown> {
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

  protected async _processEntityFromDB(entity) {
    // No-op, override in repository
    return entity;
  }

  protected async _processEntityToDB(entity) {
    // No-op, override in repository
    return entity;
  }

  protected async processEntityFromDB<T extends TEntity | undefined>(entity: T): Promise<T> {
    return this._processEntityFromDB(entity);
  }

  protected async processMultipleEntitiesFromDB<TArr extends TEntity[]>(entities: TArr): Promise<TArr> {
    return asyncMap(entities, (entity) => this.processEntityFromDB(entity)) as Promise<TArr>;
  }

  protected async processEntityToDB<T extends Partial<TEntity>>(entity: T): Promise<T> {
    return this._processEntityToDB(entity);
  }
}
