import { Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { dataSource } from "./dataSource";
import { Reminder } from "./entities/Reminder";

export class GuildReminders extends BaseGuildRepository {
  private reminders: Repository<Reminder>;

  constructor(guildId) {
    super(guildId);
    this.reminders = dataSource.getRepository(Reminder);
  }

  async getDueReminders(): Promise<Reminder[]> {
    return this.reminders
      .createQueryBuilder()
      .where("guild_id = :guildId", { guildId: this.guildId })
      .andWhere("remind_at <= NOW()")
      .getMany();
  }

  async getRemindersByUserId(userId: string): Promise<Reminder[]> {
    return this.reminders.find({
      where: {
        guild_id: this.guildId,
        user_id: userId,
      },
    });
  }

  find(id: number) {
    return this.reminders.findOne({
      where: { id },
    });
  }

  async delete(id) {
    await this.reminders.delete({
      guild_id: this.guildId,
      id,
    });
  }

  async add(userId: string, channelId: string, remindAt: string, body: string, created_at: string, source_id?: string) {
    const result = await this.reminders.insert({
      guild_id: this.guildId,
      user_id: userId,
      channel_id: channelId,
      remind_at: remindAt,
      body,
      created_at,
      source_message_id: source_id,
    });

    return (await this.find(result.identifiers[0].id))!;
  }
}
