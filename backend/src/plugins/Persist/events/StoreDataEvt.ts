import { GuildMember } from "discord.js";
import intersection from "lodash.intersection";
import { IPartialPersistData } from "../../../data/GuildPersistedData";
import { persistEvt } from "../types";

export const StoreDataEvt = persistEvt({
  event: "guildMemberRemove",

  async listener(meta) {
    const member = meta.args.member as GuildMember;
    const pluginData = meta.pluginData;

    let persist = false;
    const persistData: IPartialPersistData = {};
    const config = await pluginData.config.getForUser(member.user);

    const persistedRoles = config.persisted_roles;
    if (persistedRoles.length && member.roles) {
      const rolesToPersist = intersection(persistedRoles, member.roles);
      if (rolesToPersist.length) {
        persist = true;
        persistData.roles = rolesToPersist;
      }
    }

    if (config.persist_nicknames && member.nickname) {
      persist = true;
      persistData.nickname = member.nickname;
    }

    if (persist) {
      pluginData.state.persistedData.set(member.id, persistData);
    }
  },
});
