import { Repository } from "typeorm";
import { BaseRepository } from "./BaseRepository.js";
import { dataSource } from "./dataSource.js";
import { ArchiveEntry } from "./entities/ArchiveEntry.js";

export class Archives extends BaseRepository {
  protected archives: Repository<ArchiveEntry>;

  constructor() {
    super();
    this.archives = dataSource.getRepository(ArchiveEntry);
  }

  public deleteExpiredArchives() {
    this.archives
      .createQueryBuilder()
      .andWhere("expires_at IS NOT NULL")
      .andWhere("expires_at <= NOW()")
      .delete()
      .execute();
  }
}
