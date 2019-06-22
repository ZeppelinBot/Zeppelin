import { getRepository, Repository } from "typeorm";
import { DashboardUser } from "./entities/DashboardUser";
import { BaseRepository } from "./BaseRepository";

export class DashboardUsers extends BaseRepository {
  private dashboardUsers: Repository<DashboardUser>;

  constructor() {
    super();
    this.dashboardUsers = getRepository(DashboardUser);
  }
}
