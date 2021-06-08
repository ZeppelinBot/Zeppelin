import { getRepository, Repository } from "typeorm";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { ButtonRole } from "./entities/ButtonRole";

export class GuildButtonRoles extends BaseGuildRepository {
  private buttonRoles: Repository<ButtonRole>;

  constructor(guildId) {
    super(guildId);
    this.buttonRoles = getRepository(ButtonRole);
  }

  async getForButtonId(buttonId: string) {
    return this.buttonRoles.findOne({
      guild_id: this.guildId,
      button_id: buttonId,
    });
  }

  async getAllForMessageId(messageId: string) {
    return this.buttonRoles.find({
      guild_id: this.guildId,
      message_id: messageId,
    });
  }

  async removeForButtonId(buttonId: string) {
    return this.buttonRoles.delete({
      guild_id: this.guildId,
      button_id: buttonId,
    });
  }

  async removeAllForMessageId(messageId: string) {
    return this.buttonRoles.delete({
      guild_id: this.guildId,
      message_id: messageId,
    });
  }

  async getForButtonGroup(buttonGroup: string) {
    return this.buttonRoles.find({
      guild_id: this.guildId,
      button_group: buttonGroup,
    });
  }

  async add(channelId: string, messageId: string, buttonId: string, buttonGroup: string, buttonName: string) {
    await this.buttonRoles.insert({
      guild_id: this.guildId,
      channel_id: channelId,
      message_id: messageId,
      button_id: buttonId,
      button_group: buttonGroup,
      button_name: buttonName,
    });
  }
}
