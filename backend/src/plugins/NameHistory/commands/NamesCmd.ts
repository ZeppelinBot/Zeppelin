import { Snowflake } from "discord.js";
import { createChunkedMessage, disableCodeBlocks } from "vety/helpers";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { MAX_NICKNAME_ENTRIES_PER_USER } from "../../../data/GuildNicknameHistory.js";
import { MAX_USERNAME_ENTRIES_PER_USER } from "../../../data/UsernameHistory.js";
import { NICKNAME_RETENTION_PERIOD } from "../../../data/cleanup/nicknames.js";
import { DAYS, renderUsername } from "../../../utils.js";
import { nameHistoryCmd } from "../types.js";

export const NamesCmd = nameHistoryCmd({
  trigger: "names",
  permission: "can_view",

  signature: {
    userId: ct.userId(),
  },

  async run({ message: msg, args, pluginData }) {
    const nicknames = await pluginData.state.nicknameHistory.getByUserId(args.userId);
    const usernames = await pluginData.state.usernameHistory.getByUserId(args.userId);

    if (nicknames.length === 0 && usernames.length === 0) {
      void pluginData.state.common.sendErrorMessage(msg, "No name history found");
      return;
    }

    const nicknameRows = nicknames.map(
      (r) => `\`[${r.timestamp}]\` ${r.nickname ? `**${disableCodeBlocks(r.nickname)}**` : "*None*"}`,
    );
    const usernameRows = usernames.map((r) => `\`[${r.timestamp}]\` **${disableCodeBlocks(r.username)}**`);

    const user = await pluginData.client.users.fetch(args.userId as Snowflake).catch(() => null);
    const currentUsername = user ? renderUsername(user) : args.userId;

    const nicknameDays = Math.round(NICKNAME_RETENTION_PERIOD / DAYS);
    const usernameDays = Math.round(NICKNAME_RETENTION_PERIOD / DAYS);

    let message = `Name history for **${currentUsername}**:`;
    if (nicknameRows.length) {
      message += `\n\n__Last ${MAX_NICKNAME_ENTRIES_PER_USER} nicknames within ${nicknameDays} days:__\n${nicknameRows.join(
        "\n",
      )}`;
    }
    if (usernameRows.length) {
      message += `\n\n__Last ${MAX_USERNAME_ENTRIES_PER_USER} usernames within ${usernameDays} days:__\n${usernameRows.join(
        "\n",
      )}`;
    }

    createChunkedMessage(msg.channel, message);
  },
});
