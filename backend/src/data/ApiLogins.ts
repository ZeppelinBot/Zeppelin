import crypto from "crypto";
import moment from "moment-timezone";
import { getRepository, Repository } from "typeorm";
// tslint:disable-next-line:no-submodule-imports
import uuidv4 from "uuid/v4";
import { DAYS, DBDateFormat } from "../utils";
import { BaseRepository } from "./BaseRepository";
import { ApiLogin } from "./entities/ApiLogin";

const LOGIN_EXPIRY_TIME = 1 * DAYS;

export class ApiLogins extends BaseRepository {
  private apiLogins: Repository<ApiLogin>;

  constructor() {
    super();
    this.apiLogins = getRepository(ApiLogin);
  }

  async getUserIdByApiKey(apiKey: string): Promise<string | null> {
    const [loginId, token] = apiKey.split(".");
    if (!loginId || !token) {
      return null;
    }

    const login = await this.apiLogins
      .createQueryBuilder()
      .where("id = :id", { id: loginId })
      .andWhere("expires_at > NOW()")
      .getOne();

    if (!login) {
      return null;
    }

    const hash = crypto.createHash("sha256");
    hash.update(loginId + token); // Remember to use loginId as the salt
    const hashedToken = hash.digest("hex");
    if (hashedToken !== login.token) {
      return null;
    }

    return login.user_id;
  }

  async addLogin(userId: string): Promise<string> {
    // Generate random login id
    let loginId;
    while (true) {
      loginId = uuidv4();
      const existing = await this.apiLogins.findOne({
        where: {
          id: loginId,
        },
      });
      if (!existing) break;
    }

    // Generate token
    const token = uuidv4();
    const hash = crypto.createHash("sha256");
    hash.update(loginId + token); // Use loginId as a salt
    const hashedToken = hash.digest("hex");

    // Save this to the DB
    await this.apiLogins.insert({
      id: loginId,
      token: hashedToken,
      user_id: userId,
      logged_in_at: moment.utc().format(DBDateFormat),
      expires_at: moment.utc().add(LOGIN_EXPIRY_TIME, "ms").format(DBDateFormat),
    });

    return `${loginId}.${token}`;
  }

  expireApiKey(apiKey) {
    const [loginId, token] = apiKey.split(".");
    if (!loginId || !token) return;

    return this.apiLogins.update(
      { id: loginId },
      {
        expires_at: moment.utc().format(DBDateFormat),
      },
    );
  }

  async refreshApiKeyExpiryTime(apiKey) {
    const [loginId, token] = apiKey.split(".");
    if (!loginId || !token) return;

    const updatedTime = moment().utc().add(LOGIN_EXPIRY_TIME, "ms");

    const login = await this.apiLogins.createQueryBuilder().where("id = :id", { id: loginId }).getOne();
    if (!login || moment.utc(login.expires_at).isSameOrAfter(updatedTime)) return;

    await this.apiLogins.update(
      { id: loginId },
      {
        expires_at: updatedTime.format(DBDateFormat),
      },
    );
  }
}
