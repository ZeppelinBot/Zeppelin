import { Repository } from "typeorm";
import { BaseRepository } from "./BaseRepository.js";
import { dataSource } from "./dataSource.js";
import { Supporter } from "./entities/Supporter.js";

export class Supporters extends BaseRepository {
  private supporters: Repository<Supporter>;

  constructor() {
    super();
    this.supporters = dataSource.getRepository(Supporter);
  }

  getAll() {
    return this.supporters.find();
  }
}
