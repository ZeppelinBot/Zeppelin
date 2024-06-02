import moment from "moment-timezone";
import { Repository } from "typeorm";
import { DBDateFormat } from "../utils.js";
import { BaseRepository } from "./BaseRepository.js";
import { dataSource } from "./dataSource.js";
import { ScheduledPost } from "./entities/ScheduledPost.js";

export class ScheduledPosts extends BaseRepository {
  private scheduledPosts: Repository<ScheduledPost>;

  constructor() {
    super();
    this.scheduledPosts = dataSource.getRepository(ScheduledPost);
  }

  getScheduledPostsDueSoon(threshold: number): Promise<ScheduledPost[]> {
    const thresholdDateStr = moment.utc().add(threshold, "ms").format(DBDateFormat);
    return this.scheduledPosts.createQueryBuilder().andWhere("post_at <= :date", { date: thresholdDateStr }).getMany();
  }
}
