import knex from "../knex";

export class GuildModActions {
  protected guildId: string;

  constructor(guildId) {
    this.guildId = guildId;
  }

  find(id: number) {
    return knex("mod_actions")
      .where("guild_id", this.guildId)
      .where("id", id)
      .first();
  }

  findByCaseNumber(caseNumber: number) {
    return knex("mod_actions")
      .where("guild_id", this.guildId)
      .where("case_number", caseNumber)
      .first();
  }

  getActionNotes(actionId: number) {
    return knex("mod_action_notes")
      .where("mod_action_id", actionId)
      .select();
  }

  getByUserId(userId: string) {
    return knex("mod_actions")
      .where("guild_id", this.guildId)
      .where("user_id", userId)
      .select();
  }

  create(data) {
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
