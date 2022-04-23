import { getRepository, Repository } from "typeorm";
import { Reminder } from "./entities/Reminder";
import { BaseRepository } from "./BaseRepository";
import moment from "moment-timezone";
import { DBDateFormat } from "../utils";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { RoleQueueItem } from "./entities/RoleQueueItem";
import { connection } from "./db";
import { RoleButtonsItem } from "./entities/RoleButtonsItem";

export class GuildRoleButtons extends BaseGuildRepository {
  private roleButtons: Repository<RoleButtonsItem>;

  constructor(guildId) {
    super(guildId);
    this.roleButtons = getRepository(RoleButtonsItem);
  }

  getSavedRoleButtons(): Promise<RoleButtonsItem[]> {
    return this.roleButtons.find({ guild_id: this.guildId });
  }

  async deleteRoleButtonItem(name: string): Promise<void> {
    await this.roleButtons.delete({
      guild_id: this.guildId,
      name,
    });
  }

  async saveRoleButtonItem(name: string, channelId: string, messageId: string, hash: string): Promise<void> {
    await this.roleButtons.insert({
      guild_id: this.guildId,
      name,
      channel_id: channelId,
      message_id: messageId,
      hash,
    });
  }
}
