import { getRepository, Repository } from "typeorm";
import { ScheduledPost } from "./entities/ScheduledPost";
import { BaseRepository } from "./BaseRepository";
import moment from "moment-timezone";
import { DBDateFormat } from "../utils";

export class ScheduledPosts extends BaseRepository {
  private scheduledPosts: Repository<ScheduledPost>;

  constructor() {
    super();
    this.scheduledPosts = getRepository(ScheduledPost);
  }

  getScheduledPostsDueSoon(threshold: number): Promise<ScheduledPost[]> {
    const thresholdDateStr = moment.utc().add(threshold, "ms").format(DBDateFormat);
    return this.scheduledPosts.createQueryBuilder().andWhere("post_at <= :date", { date: thresholdDateStr }).getMany();
  }
}
