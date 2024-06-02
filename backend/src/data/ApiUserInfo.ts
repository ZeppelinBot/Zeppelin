import moment from "moment-timezone";
import { Repository } from "typeorm";
import { DBDateFormat } from "../utils.js";
import { BaseRepository } from "./BaseRepository.js";
import { dataSource } from "./dataSource.js";
import { ApiUserInfoData, ApiUserInfo as ApiUserInfoEntity } from "./entities/ApiUserInfo.js";

export class ApiUserInfo extends BaseRepository {
  private apiUserInfo: Repository<ApiUserInfoEntity>;

  constructor() {
    super();
    this.apiUserInfo = dataSource.getRepository(ApiUserInfoEntity);
  }

  get(id) {
    return this.apiUserInfo.findOne({
      where: {
        id,
      },
    });
  }

  update(id, data: ApiUserInfoData) {
    return dataSource.transaction(async (entityManager) => {
      const repo = entityManager.getRepository(ApiUserInfoEntity);

      const existingInfo = await repo.findOne({ where: { id } });
      const updatedAt = moment.utc().format(DBDateFormat);

      if (existingInfo) {
        await repo.update({ id }, { data, updated_at: updatedAt });
      } else {
        await repo.insert({ id, data, updated_at: updatedAt });
      }
    });
  }
}
