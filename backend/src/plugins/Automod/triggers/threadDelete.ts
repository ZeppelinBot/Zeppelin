import { Snowflake } from "discord-api-types";
import { User, Util } from "discord.js";
import * as t from "io-ts";
import { tNullable } from "../../../utils";
import { automodTrigger } from "../helpers";

interface ThreadDeleteResult {
  matchedThreadId: Snowflake;
  matchedThreadName: string;
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
        matchedThreadOwner: context.user,
      },
    };
  },

  renderMatchInformation({ matchResult }) {
    const threadId = matchResult.extra.matchedThreadId;
    const threadName = matchResult.extra.matchedThreadName;
    const threadOwner = matchResult.extra.matchedThreadOwner;
    if (threadOwner) {
      return `Thread **${Util.escapeBold(threadName ?? "Unknown")}** (\`${threadId}\`) created by **${Util.escapeBold(
        threadOwner.tag,
      )}** (\`${threadOwner.id}\`) has been deleted`;
    }
    return `Thread **${Util.escapeBold(threadName ?? "Unknown")}** (\`${threadId}\`) has been deleted`;
  },
});
