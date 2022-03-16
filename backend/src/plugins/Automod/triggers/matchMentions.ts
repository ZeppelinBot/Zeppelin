import { Snowflake } from "discord.js";
import * as t from "io-ts";
import { tNullable } from "../../../utils";
import { getTextMatchPartialSummary } from "../functions/getTextMatchPartialSummary";
import { automodTrigger } from "../helpers";

const configType = t.type({
  channels: tNullable(t.array(t.string)),
  everyone: tNullable(t.boolean),
  roles: tNullable(t.array(t.string)),
  users: tNullable(t.array(t.string)),
});

type ConfigKeys = keyof t.TypeOf<typeof configType>;

const summaryType: Record<ConfigKeys, string> = {
  channels: "channel",
  everyone: "everyone",
  roles: "role",
  users: "user",
};

interface MatchResultType {
  reason: typeof summaryType[ConfigKeys];
}

const predicate = (items: Snowflake[], configIds?: Snowflake[] | null): boolean =>
  !!configIds?.length && items.some((item) => configIds.includes(item));

export const MatchMentionsTrigger = automodTrigger<MatchResultType>()({
  configType,

  defaultConfig: {
    channels: [],
    everyone: false,
    roles: [],
    users: [],
  },

  async match({ context, triggerConfig }) {
    if (!context.message?.data.mentions) return;

    for (const key of Object.keys(summaryType) as Array<keyof typeof summaryType>) {
      if (key === "everyone") {
        if (context.message.data.mentions.everyone && triggerConfig.everyone) {
          return { extra: { reason: summaryType.everyone } };
        }
        continue;
      }

      if (predicate(context.message.data.mentions[key], triggerConfig[key])) {
        return { extra: { reason: summaryType[key] } };
      }
    }

    return null;
  },

  renderMatchInformation({ pluginData, contexts, matchResult }) {
    const partialSummary = getTextMatchPartialSummary(pluginData, "message", contexts[0]);
    return `Matched ${matchResult.extra.reason} mention in ${partialSummary}`;
  },
});
