import { Config } from "./entities/Config";
import {
  getConnection,
  getRepository,
  Repository,
  Transaction,
  TransactionManager,
  TransactionRepository,
} from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { connection } from "./db";
import { BaseRepository } from "./BaseRepository";

export class Configs extends BaseRepository {
  private configs: Repository<Config>;

  constructor() {
    super();
    this.configs = getRepository(Config);
  }

  getActiveByKey(key) {
    return this.configs.findOne({
      where: {
        key,
        is_active: true,
      },
    });
  }

  async hasConfig(key) {
    return (await this.getActiveByKey(key)) != null;
  }

  async saveNewRevision(key, config, editedBy) {
    return connection.transaction(async entityManager => {
      const repo = entityManager.getRepository(Config);
      // Mark all old revisions inactive
      await repo.update({ key }, { is_active: false });
      // Add new, active revision
      await repo.insert({
        key,
        config,
        is_active: true,
        edited_by: editedBy,
      });
    });
  }
}
