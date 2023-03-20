import { getRepository, In, InsertResult, Repository } from "typeorm";
import { Queue } from "../Queue";
import { chunkArray } from "../utils";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { CaseTypes } from "./CaseTypes";
import { connection } from "./db";
import { Case } from "./entities/Case";
import { CaseNote } from "./entities/CaseNote";

const CASE_SUMMARY_REASON_MAX_LENGTH = 300;

export class GuildCases extends BaseGuildRepository {
  private cases: Repository<Case>;
  private caseNotes: Repository<CaseNote>;

  protected createQueue: Queue;

  constructor(guildId) {
    super(guildId);
    this.cases = getRepository(Case);
    this.caseNotes = getRepository(CaseNote);
    this.createQueue = new Queue();
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

  async getMinCaseNumber(): Promise<number> {
    const result = await this.cases
      .createQueryBuilder()
      .where("guild_id = :guildId", { guildId: this.guildId })
      .select(["MIN(case_number) AS min_case_number"])
      .getRawOne<{ min_case_number: number }>();

    return result?.min_case_number || 0;
  }

  async getMaxCaseNumber(): Promise<number> {
    const result = await this.cases
      .createQueryBuilder()
      .where("guild_id = :guildId", { guildId: this.guildId })
      .select(["MAX(case_number) AS max_case_number"])
      .getRawOne<{ max_case_number: number }>();

    return result?.max_case_number || 0;
  }

  async setHidden(id: number, hidden: boolean): Promise<void> {
    await this.cases.update(
      { id },
      {
        is_hidden: hidden,
      },
    );
  }

  async createInternal(data): Promise<InsertResult> {
    return this.createQueue.add(async () => {
      const lastCaseNumberRow = await this.cases
        .createQueryBuilder()
        .select(["MAX(case_number) AS last_case_number"])
        .where("guild_id = :guildId", { guildId: this.guildId })
        .getRawOne();
      const lastCaseNumber = lastCaseNumberRow?.last_case_number || 0;

      return this.cases
        .insert({
          case_number: lastCaseNumber + 1,
          ...data,
          guild_id: this.guildId,
        })
        .catch((err) => {
          if (err?.code === "ER_DUP_ENTRY") {
            if (data.audit_log_id) {
              // FIXME: Debug
              // tslint:disable-next-line:no-console
              console.trace(`Tried to insert case with duplicate audit_log_id`);
              return this.createInternal({
                ...data,
                audit_log_id: undefined,
              });
            }
          }

          throw err;
        });
    });
  }

  async create(data): Promise<Case> {
    const result = await this.createInternal(data);
    return (await this.find(result.identifiers[0].id))!;
  }

  update(id, data) {
    return this.cases.update(id, data);
  }

  async softDelete(id: number, deletedById: string, deletedByName: string, deletedByText: string) {
    return connection.transaction(async (entityManager) => {
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

  async deleteAllCases(): Promise<void> {
    const idRows = await this.cases
      .createQueryBuilder()
      .where("guild_id = :guildId", { guildId: this.guildId })
      .select(["id"])
      .getRawMany<{ id: number }>();
    const ids = idRows.map((r) => r.id);
    const batches = chunkArray(ids, 500);
    for (const batch of batches) {
      await this.cases.createQueryBuilder().where("id IN (:ids)", { ids: batch }).delete().execute();
    }
  }

  async bumpCaseNumbers(amount: number): Promise<void> {
    await this.cases
      .createQueryBuilder()
      .where("guild_id = :guildId", { guildId: this.guildId })
      .update()
      .set({
        case_number: () => `case_number + ${parseInt(amount as unknown as string, 10)}`,
      })
      .execute();
  }

  getExportCases(skip: number, take: number): Promise<Case[]> {
    return this.cases.find({
      where: {
        guild_id: this.guildId,
      },
      relations: ["notes"],
      order: {
        case_number: "ASC",
      },
      skip,
      take,
    });
  }
}
