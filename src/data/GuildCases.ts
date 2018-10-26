import { Case } from "./entities/Case";
import { CaseNote } from "./entities/CaseNote";
import { BaseRepository } from "./BaseRepository";
import { getRepository, In, Repository } from "typeorm";

export class GuildCases extends BaseRepository {
  private cases: Repository<Case>;
  private caseNotes: Repository<CaseNote>;

  constructor(guildId) {
    super(guildId);
    this.cases = getRepository(Case);
    this.caseNotes = getRepository(CaseNote);
  }

  async get(ids: number[]): Promise<Case[]> {
    return this.cases.find({
      relations: this.getRelations(),
      where: {
        guild_id: this.guildId,
        id: In(ids)
      }
    });
  }

  async find(id: number): Promise<Case> {
    return this.cases.findOne({
      relations: this.getRelations(),
      where: {
        guild_id: this.guildId,
        id
      }
    });
  }

  async findByCaseNumber(caseNumber: number): Promise<Case> {
    return this.cases.findOne({
      relations: this.getRelations(),
      where: {
        guild_id: this.guildId,
        case_number: caseNumber
      }
    });
  }

  async getByUserId(userId: string): Promise<Case[]> {
    return this.cases.find({
      relations: this.getRelations(),
      where: {
        guild_id: this.guildId,
        user_id: userId
      }
    });
  }

  async create(data): Promise<number> {
    const result = await this.cases.insert({
      ...data,
      guild_id: this.guildId,
      case_number: () => `(SELECT IFNULL(MAX(case_number)+1, 1) FROM cases AS ma2 WHERE guild_id = ${this.guildId})`
    });

    return result.identifiers[0].id;
  }

  update(id, data) {
    return this.cases.update(id, data);
  }

  async createNote(caseId: number, data: any): Promise<number> {
    const result = await this.caseNotes.insert({
      ...data,
      case_id: caseId
    });

    return result.identifiers[0].id;
  }
}
