import { BaseRepository } from "./BaseRepository";

export class BaseGuildRepository<TEntity extends unknown = unknown> extends BaseRepository<TEntity> {
  private static guildInstances: Map<string, any>;

  protected guildId: string;

  constructor(guildId: string) {
    super();
    this.guildId = guildId;
  }

  /**
   * Returns a cached instance of the inheriting class for the specified guildId,
   * or creates a new instance if one doesn't exist yet
   */
  public static getGuildInstance<T extends typeof BaseGuildRepository>(this: T, guildId: string): InstanceType<T> {
    if (!this.guildInstances) {
      this.guildInstances = new Map();
    }

    if (!this.guildInstances.has(guildId)) {
      this.guildInstances.set(guildId, new this(guildId));
    }

    return this.guildInstances.get(guildId) as InstanceType<T>;
  }
}
