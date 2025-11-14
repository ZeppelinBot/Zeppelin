import { Snowflake } from "discord.js";
import { z } from "zod";
import { verboseChannelMention } from "../../../utils.js";
import { automodTrigger } from "../helpers.js";

interface AnyMessageResultType {}

const configSchema = z.strictObject({});

export const AnyMessageTrigger = automodTrigger<AnyMessageResultType>()({
  configSchema,

  async match({ context }) {
    if (!context.message) {
      return;
    }

    return {
      extra: {},
    };
  },

  renderMatchInformation({ pluginData, contexts }) {
    const channel = pluginData.guild.channels.cache.get(contexts[0].message!.channel_id as Snowflake);
    return `Matched message (\`${contexts[0].message!.id}\`) in ${
      channel ? verboseChannelMention(channel) : "Unknown Channel"
    }`;
  },
});
