import { User, escapeBold, type Snowflake } from "discord.js";
import { z } from "zod";
import { renderUsername } from "../../../utils.js";
import { automodTrigger } from "../helpers.js";

interface ThreadDeleteResult {
  matchedThreadId: Snowflake;
  matchedThreadName: string;
  matchedThreadParentId: Snowflake;
  matchedThreadParentName: string;
  matchedThreadOwner: User | undefined;
}

const configSchema = z.strictObject({});

export const ThreadDeleteTrigger = automodTrigger<ThreadDeleteResult>()({
  configSchema,

  async match({ context }) {
    if (!context.threadChange?.deleted) {
      return;
    }

    const thread = context.threadChange.deleted;

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
      return `Thread **#${threadName ?? "Unknown"}** (\`${threadId}\`) created by **${escapeBold(
        renderUsername(threadOwner),
      )}** (\`${threadOwner.id}\`) in the **#${parentName}** (\`${parentId}\`) channel has been deleted`;
    }
    return `Thread **#${
      threadName ?? "Unknown"
    }** (\`${threadId}\`) from the **#${parentName}** (\`${parentId}\`) channel has been deleted`;
  },
});
