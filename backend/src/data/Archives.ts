import { Repository } from "typeorm";
import { BaseRepository } from "./BaseRepository";
import { dataSource } from "./dataSource";
import { ArchiveEntry } from "./entities/ArchiveEntry";

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
