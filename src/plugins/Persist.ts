import { decorators as d, IPluginOptions } from "knub";
import { GuildPersistedData, IPartialPersistData } from "../data/GuildPersistedData";
import intersection from "lodash.intersection";
import { Member, MemberOptions } from "eris";
import { GuildLogs } from "../data/GuildLogs";
import { LogType } from "../data/LogType";
import { stripObjectToScalars } from "../utils";
import { ZeppelinPlugin } from "./ZeppelinPlugin";

interface IPersistPluginConfig {
  persisted_roles: string[];
  persist_nicknames: boolean;
  persist_voice_mutes: boolean;
}

export class PersistPlugin extends ZeppelinPlugin<IPersistPluginConfig> {
  public static pluginName = "persist";

  protected persistedData: GuildPersistedData;
  protected logs: GuildLogs;

  getDefaultOptions(): IPluginOptions<IPersistPluginConfig> {
    return {
      config: {
        persisted_roles: [],
        persist_nicknames: false,
        persist_voice_mutes: false,
      },
    };
  }

  onLoad() {
    this.persistedData = GuildPersistedData.getInstance(this.guildId);
    this.logs = new GuildLogs(this.guildId);
  }

  @d.event("guildMemberRemove")
  onGuildMemberRemove(_, member: Member) {
    let persist = false;
    const persistData: IPartialPersistData = {};
    const config = this.getConfig();

    const persistedRoles = config.persisted_roles;
    if (persistedRoles.length && member.roles) {
      const rolesToPersist = intersection(persistedRoles, member.roles);
      if (rolesToPersist.length) {
        persist = true;
        persistData.roles = rolesToPersist;
      }
    }

    if (config.persist_nicknames && member.nick) {
      persist = true;
      persistData.nickname = member.nick;
    }

    if (config.persist_voice_mutes && member.voiceState && member.voiceState.mute) {
      persist = true;
      persistData.is_voice_muted = true;
    }

    if (persist) {
      this.persistedData.set(member.id, persistData);
    }
  }

  @d.event("guildMemberAdd")
  async onGuildMemberAdd(_, member: Member) {
    const persistedData = await this.persistedData.find(member.id);
    if (!persistedData) return;

    let restore = false;
    const toRestore: MemberOptions = {};
    const config = this.getConfig();

    const persistedRoles = config.persisted_roles;
    if (persistedRoles.length) {
      const rolesToRestore = intersection(persistedRoles, persistedData.roles);
      if (rolesToRestore.length) {
        restore = true;
        toRestore.roles = rolesToRestore;
      }
    }

    if (config.persist_nicknames && persistedData.nickname) {
      restore = true;
      toRestore.nick = persistedData.nickname;
    }

    if (config.persist_voice_mutes && persistedData.is_voice_muted) {
      restore = true;
      toRestore.mute = true;
    }

    if (restore) {
      await member.edit(toRestore, "Restored upon rejoin");
      await this.persistedData.clear(member.id);

      this.logs.log(LogType.MEMBER_RESTORE, {
        member: stripObjectToScalars(member, ["user"]),
      });
    }
  }
}
