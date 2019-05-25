export class BaseRepository {
  private static guildInstances: Map<string, any>;
  private nextRelations: string[];

  protected guildId: string;

  constructor(guildId: string) {
    this.guildId = guildId;
    this.nextRelations = [];
  }

  /**
   * Returns a cached instance of the inheriting class for the specified guildId,
   * or creates a new instance if one doesn't exist yet
   */
  public static getInstance<T extends typeof BaseRepository>(this: T, guildId: string): InstanceType<T> {
    if (!this.guildInstances) {
      this.guildInstances = new Map();
    }

    if (!this.guildInstances.has(guildId)) {
      this.guildInstances.set(guildId, new this(guildId));
    }

    return this.guildInstances.get(guildId) as InstanceType<T>;
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
