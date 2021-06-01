import { persistEvt } from "../types";
import { IPartialPersistData } from "../../../data/GuildPersistedData";

import intersection from "lodash.intersection";

export const StoreDataEvt = persistEvt({
  event: "guildMemberRemove",

  async listener(meta) {
    const member = meta.args.member as Member;
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

    if (config.persist_nicknames && member.nick) {
      persist = true;
      persistData.nickname = member.nick;
    }

    if (persist) {
      pluginData.state.persistedData.set(member.id, persistData);
    }
  },
});
