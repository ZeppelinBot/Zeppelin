import { getRepository, In, Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { CaseTypes } from "./CaseTypes";
import { connection } from "./db";
import { Case } from "./entities/Case";
import { CaseNote } from "./entities/CaseNote";
import moment = require("moment-timezone");

const CASE_SUMMARY_REASON_MAX_LENGTH = 300;

export class GuildCases extends BaseGuildRepository {
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
        id: In(ids),
      },
    });
  }

  async find(id: number): Promise<Case | undefined> {
    return this.cases.findOne({
      relations: this.getRelations(),
      where: {
        guild_id: this.guildId,
        id,
      },
    });
  }

  async findByCaseNumber(caseNumber: number): Promise<Case | undefined> {
    return this.cases.findOne({
      relations: this.getRelations(),
      where: {
        guild_id: this.guildId,
        case_number: caseNumber,
      },
    });
  }

  async findLatestByModId(modId: string): Promise<Case | undefined> {
    return this.cases.findOne({
      relations: this.getRelations(),
      where: {
        guild_id: this.guildId,
        mod_id: modId,
      },
      order: {
        case_number: "DESC",
      },
    });
  }

  async findByAuditLogId(auditLogId: string): Promise<Case | undefined> {
    return this.cases.findOne({
      relations: this.getRelations(),
      where: {
        guild_id: this.guildId,
        audit_log_id: auditLogId,
      },
    });
  }

  async getByUserId(userId: string): Promise<Case[]> {
    return this.cases.find({
      relations: this.getRelations(),
      where: {
        guild_id: this.guildId,
        user_id: userId,
      },
    });
  }

  async getTotalCasesByModId(modId: string): Promise<number> {
    return this.cases.count({
      where: {
        guild_id: this.guildId,
        mod_id: modId,
        is_hidden: 0,
      },
    });
  }

  async getRecentByModId(modId: string, count: number, skip = 0): Promise<Case[]> {
    return this.cases.find({
      relations: this.getRelations(),
      where: {
        guild_id: this.guildId,
        mod_id: modId,
        is_hidden: 0,
      },
      skip,
      take: count,
      order: {
        case_number: "DESC",
      },
    });
  }

  async setHidden(id: number, hidden: boolean): Promise<void> {
    await this.cases.update(
      { id },
      {
        is_hidden: hidden,
      },
    );
  }

  async create(data): Promise<Case> {
    const result = await this.cases.insert({
      ...data,
      guild_id: this.guildId,
      case_number: () => `(SELECT IFNULL(MAX(case_number)+1, 1) FROM cases AS ma2 WHERE guild_id = ${this.guildId})`,
    });

    return (await this.find(result.identifiers[0].id))!;
  }

  update(id, data) {
    return this.cases.update(id, data);
  }

  async softDelete(id: number, deletedById: string, deletedByName: string, deletedByText: string) {
    return connection.transaction(async entityManager => {
      const cases = entityManager.getRepository(Case);
      const caseNotes = entityManager.getRepository(CaseNote);

      await Promise.all([
        caseNotes.delete({
          case_id: id,
        }),
        cases.update(id, {
          user_id: "0",
          user_name: "Unknown#0000",
          mod_id: null,
          mod_name: "Unknown#0000",
          type: CaseTypes.Deleted,
          audit_log_id: null,
          is_hidden: false,
          pp_id: null,
          pp_name: null,
        }),
      ]);

      await caseNotes.insert({
        case_id: id,
        mod_id: deletedById,
        mod_name: deletedByName,
        body: deletedByText,
      });
    });
  }

  async createNote(caseId: number, data: any): Promise<void> {
    await this.caseNotes.insert({
      ...data,
      case_id: caseId,
    });
  }
}
