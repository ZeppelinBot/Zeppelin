import { getRepository, Repository } from "typeorm";
import { DashboardLogin } from "./entities/DashboardLogin";
import { BaseRepository } from "./BaseRepository";
import crypto from "crypto";
import moment from "moment-timezone";

// tslint:disable-next-line:no-submodule-imports
import uuidv4 from "uuid/v4";
import { DBDateFormat } from "../utils";
import { log } from "util";

export interface DashboardLoginUserData {
  username: string;
  discriminator: string;
  avatar: string;
}

export class DashboardLogins extends BaseRepository {
  private dashboardLogins: Repository<DashboardLogin>;

  constructor() {
    super();
    this.dashboardLogins = getRepository(DashboardLogin);
  }

  async getUserIdByApiKey(apiKey: string): Promise<string | null> {
    const [loginId, token] = apiKey.split(".");
    if (!loginId || !token) {
      return null;
    }

    const login = await this.dashboardLogins
      .createQueryBuilder()
      .where("id = :id", { id: loginId })
      .where("expires_at > NOW()")
      .getOne();

    if (!login) {
      return null;
    }

    const hash = crypto.createHash("sha256");
    hash.update(token);
    const hashedToken = hash.digest("hex");
    if (hashedToken !== login.token) {
      return null;
    }

    return login.user_id;
  }

  async addLogin(userId: string, userData: DashboardLoginUserData): Promise<string> {
    // Generate random login id
    let loginId;
    while (true) {
      loginId = uuidv4();
      const existing = await this.dashboardLogins.findOne({
        where: {
          id: loginId,
        },
      });
      if (!existing) break;
    }

    // Generate token
    const token = uuidv4();
    const hash = crypto.createHash("sha256");
    hash.update(token);
    const hashedToken = hash.digest("hex");

    // Save this to the DB
    await this.dashboardLogins.insert({
      id: loginId,
      token: hashedToken,
      user_id: userId,
      user_data: userData,
      logged_in_at: moment().format(DBDateFormat),
      expires_at: moment()
        .add(1, "day")
        .format(DBDateFormat),
    });

    return `${loginId}.${token}`;
  }
}
