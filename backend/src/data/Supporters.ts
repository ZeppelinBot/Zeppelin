import { Repository } from "typeorm";
import { BaseRepository } from "./BaseRepository";
import { dataSource } from "./dataSource";
import { Supporter } from "./entities/Supporter";

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
