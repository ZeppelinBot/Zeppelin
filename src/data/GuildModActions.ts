import knex from "../knex";
import ModAction from "../models/ModAction";

export class GuildModActions {
  protected guildId: string;

  constructor(guildId) {
    this.guildId = guildId;
  }

  async find(id: number): Promise<ModAction> {
    const result = await knex("mod_actions")
      .where("guild_id", this.guildId)
      .where("id", id)
      .first();

    return result ? new ModAction(result) : null;
  }

  async findByCaseNumber(caseNumber: number): Promise<ModAction> {
    const result = await knex("mod_actions")
      .where("guild_id", this.guildId)
      .where("case_number", caseNumber)
      .first();

    return result ? new ModAction(result) : null;
  }

  async getActionNotes(actionId: number): Promise<ModAction[]> {
    const results = await knex("mod_action_notes")
      .where("mod_action_id", actionId)
      .select();

    return results.map(r => new ModAction(r));
  }

  async getByUserId(userId: string): Promise<ModAction[]> {
    const results = await knex("mod_actions")
      .where("guild_id", this.guildId)
      .where("user_id", userId)
      .select();

    return results.map(r => new ModAction(r));
  }

  async create(data): Promise<number> {
    return knex
      .insert({
        ...data,
        guild_id: this.guildId,
        case_number: knex.raw(
          "(SELECT IFNULL(MAX(case_number)+1, 1) FROM mod_actions AS ma2 WHERE guild_id = ?)",
          this.guildId
        )
      })
      .returning("id")
      .into("mod_actions")
      .then(ids => Number(ids[0]));
  }

  update(id, data) {
    return knex("mod_actions")
      .where("id", id)
      .update(data);
  }

  createNote(modActionId: number, data: any) {
    return knex
      .insert({
        ...data,
        mod_action_id: modActionId
      })
      .into("mod_action_notes")
      .return();
  }
}
