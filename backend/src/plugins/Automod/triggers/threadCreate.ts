import { escapeBold, User, type Snowflake } from "discord.js";
import * as t from "io-ts";
import { automodTrigger } from "../helpers";

interface ThreadCreateResult {
  matchedThreadId: Snowflake;
  matchedThreadName: string;
  matchedThreadParentId: Snowflake;
  matchedThreadParentName: string;
  matchedThreadOwner: User | undefined;
}

export const ThreadCreateTrigger = automodTrigger<ThreadCreateResult>()({
  configType: t.type({}),
  defaultConfig: {},

  async match({ context }) {
    if (!context.threadChange?.created) {
      return;
    }

    const thread = context.threadChange.created;

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

  async renderMatchInformation({ matchResult }) {
    const threadId = matchResult.extra.matchedThreadId;
    const threadName = matchResult.extra.matchedThreadName;
    const threadOwner = matchResult.extra.matchedThreadOwner;
    const parentId = matchResult.extra.matchedThreadParentId;
    const parentName = matchResult.extra.matchedThreadParentName;
    const base = `Thread **#${threadName}** (\`${threadId}\`) has been created in the **#${parentName}** (\`${parentId}\`) channel`;
    if (threadOwner) {
      return `${base} by **${escapeBold(threadOwner.tag)}** (\`${threadOwner.id}\`)`;
    }
    return base;
  },
});
