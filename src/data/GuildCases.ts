import knex from "../knex";
import Case from "../models/Case";

export class GuildCases {
  protected guildId: string;

  constructor(guildId) {
    this.guildId = guildId;
  }

  async find(id: number): Promise<Case> {
    const result = await knex("cases")
      .where("guild_id", this.guildId)
      .where("id", id)
      .first();

    return result ? new Case(result) : null;
  }

  async findByCaseNumber(caseNumber: number): Promise<Case> {
    const result = await knex("cases")
      .where("guild_id", this.guildId)
      .where("case_number", caseNumber)
      .first();

    return result ? new Case(result) : null;
  }

  async getCaseNotes(caseId: number): Promise<Case[]> {
    const results = await knex("case_notes")
      .where("case_id", caseId)
      .select();

    return results.map(r => new Case(r));
  }

  async getByUserId(userId: string): Promise<Case[]> {
    const results = await knex("cases")
      .where("guild_id", this.guildId)
      .where("user_id", userId)
      .select();

    return results.map(r => new Case(r));
  }

  async create(data): Promise<number> {
    return knex
      .insert({
        ...data,
        guild_id: this.guildId,
        case_number: knex.raw(
          "(SELECT IFNULL(MAX(case_number)+1, 1) FROM cases AS ma2 WHERE guild_id = ?)",
          this.guildId
        )
      })
      .returning("id")
      .into("cases")
      .then(ids => Number(ids[0]));
  }

  update(id, data) {
    return knex("cases")
      .where("id", id)
      .update(data);
  }

  createNote(caseId: number, data: any) {
    return knex
      .insert({
        ...data,
        case_id: caseId
      })
      .into("case_notes")
      .return();
  }
}
