import { BaseRepository } from "./BaseRepository";
import { getRepository, Repository } from "typeorm";
import { Supporter } from "./entities/Supporter";

export class Supporters extends BaseRepository {
  private supporters: Repository<Supporter>;

  constructor() {
    super();
    this.supporters = getRepository(Supporter);
  }

  getAll() {
    return this.supporters.find();
  }
}
