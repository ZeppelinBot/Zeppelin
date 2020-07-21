import { persistEvent } from "../types";
import { MemberOptions } from "eris";
import intersection from "lodash.intersection";
import { LogType } from "src/data/LogType";
import { stripObjectToScalars } from "src/utils";

export const LoadDataEvt = persistEvent({
  event: "guildMemberAdd",

  async listener(meta) {
    const member = meta.args.member;
    const pluginData = meta.pluginData;

    const memberRolesLock = await pluginData.locks.acquire(`member-roles-${member.id}`);

    const persistedData = await pluginData.state.persistedData.find(member.id);
    if (!persistedData) {
      memberRolesLock.unlock();
      return;
    }

    const toRestore: MemberOptions = {};
    const config = pluginData.config.getForMember(member);
    const restoredData = [];

    const persistedRoles = config.persisted_roles;
    if (persistedRoles.length) {
      const rolesToRestore = intersection(persistedRoles, persistedData.roles);
      if (rolesToRestore.length) {
        restoredData.push("roles");
        toRestore.roles = Array.from(new Set([...rolesToRestore, ...member.roles]));
      }
    }

    if (config.persist_nicknames && persistedData.nickname) {
      restoredData.push("nickname");
      toRestore.nick = persistedData.nickname;
    }

    if (restoredData.length) {
      await member.edit(toRestore, "Restored upon rejoin");
      await pluginData.state.persistedData.clear(member.id);

      pluginData.state.logs.log(LogType.MEMBER_RESTORE, {
        member: stripObjectToScalars(member, ["user", "roles"]),
        restoredData: restoredData.join(", "),
      });
    }

    memberRolesLock.unlock();
  },
});
