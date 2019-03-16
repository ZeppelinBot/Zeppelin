import { BaseRepository } from "./BaseRepository";
import { getRepository, Repository } from "typeorm";
import { SlowmodeChannel } from "./entities/SlowmodeChannel";
import { SlowmodeUser } from "./entities/SlowmodeUser";
import moment from "moment-timezone";

export class GuildSlowmodes extends BaseRepository {
  private slowmodeChannels: Repository<SlowmodeChannel>;
  private slowmodeUsers: Repository<SlowmodeUser>;

  constructor(guildId) {
    super(guildId);
    this.slowmodeChannels = getRepository(SlowmodeChannel);
    this.slowmodeUsers = getRepository(SlowmodeUser);
  }

  async getChannelSlowmode(channelId): Promise<SlowmodeChannel> {
    return this.slowmodeChannels.findOne({
      where: {
        guild_id: this.guildId,
        channel_id: channelId,
      },
    });
  }

  async setChannelSlowmode(channelId, seconds): Promise<void> {
    const existingSlowmode = await this.getChannelSlowmode(channelId);
    if (existingSlowmode) {
      await this.slowmodeChannels.update(
        {
          guild_id: this.guildId,
          channel_id: channelId,
        },
        {
          slowmode_seconds: seconds,
        },
      );
    } else {
      await this.slowmodeChannels.insert({
        guild_id: this.guildId,
        channel_id: channelId,
        slowmode_seconds: seconds,
      });
    }
  }

  async deleteChannelSlowmode(channelId): Promise<void> {
    await this.slowmodeChannels.delete({
      guild_id: this.guildId,
      channel_id: channelId,
    });
  }

  async getChannelSlowmodeUser(channelId, userId): Promise<SlowmodeUser> {
    return this.slowmodeUsers.findOne({
      guild_id: this.guildId,
      channel_id: channelId,
      user_id: userId,
    });
  }

  async userHasSlowmode(channelId, userId): Promise<boolean> {
    return (await this.getChannelSlowmodeUser(channelId, userId)) != null;
  }

  async addSlowmodeUser(channelId, userId): Promise<void> {
    const slowmode = await this.getChannelSlowmode(channelId);
    if (!slowmode) return;

    const expiresAt = moment()
      .add(slowmode.slowmode_seconds, "seconds")
      .format("YYYY-MM-DD HH:mm:ss");

    if (await this.userHasSlowmode(channelId, userId)) {
      // Update existing
      await this.slowmodeUsers.update(
        {
          guild_id: this.guildId,
          channel_id: channelId,
          user_id: userId,
        },
        {
          expires_at: expiresAt,
        },
      );
    } else {
      // Add new
      await this.slowmodeUsers.insert({
        guild_id: this.guildId,
        channel_id: channelId,
        user_id: userId,
        expires_at: expiresAt,
      });
    }
  }

  async clearSlowmodeUser(channelId, userId): Promise<void> {
    await this.slowmodeUsers.delete({
      guild_id: this.guildId,
      channel_id: channelId,
      user_id: userId,
    });
  }

  async getChannelSlowmodeUsers(channelId): Promise<SlowmodeUser[]> {
    return this.slowmodeUsers.find({
      where: {
        guild_id: this.guildId,
        channel_id: channelId,
      },
    });
  }

  async getExpiredSlowmodeUsers(): Promise<SlowmodeUser[]> {
    return this.slowmodeUsers
      .createQueryBuilder()
      .where("guild_id = :guildId", { guildId: this.guildId })
      .andWhere("expires_at <= NOW()")
      .getMany();
  }
}
