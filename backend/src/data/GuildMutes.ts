import moment from "moment-timezone";
import { Brackets, getRepository, Repository } from "typeorm";
import { DBDateFormat } from "../utils";
import { BaseGuildRepository } from "./BaseGuildRepository";
import { Mute } from "./entities/Mute";
import { MuteTypes } from "./MuteTypes";

export type AddMuteParams = {
  userId: Mute["user_id"];
  type: MuteTypes;
  expiresAt: number | null;
  rolesToRestore?: Mute["roles_to_restore"];
  muteRole?: string | null;
  timeoutExpiresAt?: number;
};

export class GuildMutes extends BaseGuildRepository {
  private mutes: Repository<Mute>;

  constructor(guildId) {
    super(guildId);
    this.mutes = getRepository(Mute);
  }

  async getExpiredMutes(): Promise<Mute[]> {
    return this.mutes
      .createQueryBuilder("mutes")
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere("expires_at IS NOT NULL")
      .andWhere("expires_at <= NOW()")
      .getMany();
  }

  async findExistingMuteForUserId(userId: string): Promise<Mute | undefined> {
    return this.mutes.findOne({
      where: {
        guild_id: this.guildId,
        user_id: userId,
      },
    });
  }

  async isMuted(userId: string): Promise<boolean> {
    const mute = await this.findExistingMuteForUserId(userId);
    return mute != null;
  }

  async addMute(params: AddMuteParams): Promise<Mute> {
    const expiresAt = params.expiresAt ? moment.utc(params.expiresAt).format(DBDateFormat) : null;
    const timeoutExpiresAt = params.timeoutExpiresAt ? moment.utc(params.timeoutExpiresAt).format(DBDateFormat) : null;

    const result = await this.mutes.insert({
      guild_id: this.guildId,
      user_id: params.userId,
      type: params.type,
      expires_at: expiresAt,
      roles_to_restore: params.rolesToRestore ?? [],
      mute_role: params.muteRole,
      timeout_expires_at: timeoutExpiresAt,
    });

    return (await this.mutes.findOne({ where: result.identifiers[0] }))!;
  }

  async updateExpiryTime(userId, newExpiryTime, rolesToRestore?: string[]): Promise<void> {
    const expiresAt = newExpiryTime ? moment.utc().add(newExpiryTime, "ms").format("YYYY-MM-DD HH:mm:ss") : null;

    if (rolesToRestore && rolesToRestore.length) {
      await this.mutes.update(
        {
          guild_id: this.guildId,
          user_id: userId,
        },
        {
          expires_at: expiresAt,
          roles_to_restore: rolesToRestore,
        },
      );
    } else {
      await this.mutes.update(
        {
          guild_id: this.guildId,
          user_id: userId,
        },
        {
          expires_at: expiresAt,
        },
      );
    }
  }

  async updateExpiresAt(userId: string, timestamp: number | null): Promise<void> {
    const expiresAt = timestamp ? moment.utc(timestamp).format("YYYY-MM-DD HH:mm:ss") : null;
    await this.mutes.update(
      {
        guild_id: this.guildId,
        user_id: userId,
      },
      {
        expires_at: expiresAt,
      },
    );
  }

  async updateTimeoutExpiresAt(userId: string, timestamp: number): Promise<void> {
    const timeoutExpiresAt = moment.utc(timestamp).format(DBDateFormat);
    await this.mutes.update(
      {
        guild_id: this.guildId,
        user_id: userId,
      },
      {
        timeout_expires_at: timeoutExpiresAt,
      },
    );
  }

  async getActiveMutes(): Promise<Mute[]> {
    return this.mutes
      .createQueryBuilder("mutes")
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere(
        new Brackets((qb) => {
          qb.where("expires_at > NOW()").orWhere("expires_at IS NULL");
        }),
      )
      .getMany();
  }

  async setCaseId(userId: string, caseId: number) {
    await this.mutes.update(
      {
        guild_id: this.guildId,
        user_id: userId,
      },
      {
        case_id: caseId,
      },
    );
  }

  async clear(userId) {
    await this.mutes.delete({
      guild_id: this.guildId,
      user_id: userId,
    });
  }

  async fillMissingMuteRole(muteRole: string): Promise<void> {
    await this.mutes
      .createQueryBuilder()
      .where("guild_id = :guild_id", { guild_id: this.guildId })
      .andWhere("type = :type", { type: MuteTypes.Role })
      .andWhere("mute_role IS NULL")
      .update({
        mute_role: muteRole,
      })
      .execute();
  }
}
