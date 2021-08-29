import { Snowflake } from "discord-api-types";
import { User, Util } from "discord.js";
import * as t from "io-ts";
import { tNullable } from "../../../utils";
import { automodTrigger } from "../helpers";

interface ThreadDeleteResult {
  matchedThreadId: Snowflake;
  matchedThreadName: string;
  matchedThreadParentId: Snowflake;
  matchedThreadParentName: string;
  matchedThreadOwner: User | undefined;
}

export const ThreadDeleteTrigger = automodTrigger<ThreadDeleteResult>()({
  configType: t.type({
    parent: tNullable(t.union([t.string, t.array(t.string)])),
  }),

  defaultConfig: {},

  async match({ context, triggerConfig }) {
    if (!context.threadChange?.deleted) {
      return;
    }

    const thread = context.threadChange.deleted;

    if (triggerConfig.parent) {
      const parentIds = Array.isArray(triggerConfig.parent) ? triggerConfig.parent : [triggerConfig.parent];
      if (thread.parentId && !parentIds.includes(thread.parentId)) return;
    }

    return {
      extra: {
        matchedThreadId: thread.id,
        matchedThreadName: thread.name,
        matchedThreadParentId: thread.parentId ?? "Unknown",
        matchedThreadParentName: thread.parent?.name ?? "Unknown",
        matchedThreadOwner: context.user,
      },
    };
  },

  renderMatchInformation({ matchResult }) {
    const threadId = matchResult.extra.matchedThreadId;
    const threadOwner = matchResult.extra.matchedThreadOwner;
    const threadName = matchResult.extra.matchedThreadName;
    const parentId = matchResult.extra.matchedThreadParentId;
    const parentName = matchResult.extra.matchedThreadParentName;
    if (threadOwner) {
      return `Thread **#${threadName ?? "Unknown"}** (\`${threadId}\`) created by **${Util.escapeBold(
        threadOwner.tag,
      )}** (\`${threadOwner.id}\`) in the **#${parentName}** (\`${parentId}\`) channel has been deleted`;
    }
    return `Thread **#${threadName ??
      "Unknown"}** (\`${threadId}\`) from the **#${parentName}** (\`${parentId}\`) channel has been deleted`;
  },
});
