import { Snowflake } from "discord.js";
import { createChunkedMessage, disableCodeBlocks } from "knub/dist/helpers";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { NICKNAME_RETENTION_PERIOD } from "../../../data/cleanup/nicknames";
import { MAX_NICKNAME_ENTRIES_PER_USER } from "../../../data/GuildNicknameHistory";
import { MAX_USERNAME_ENTRIES_PER_USER } from "../../../data/UsernameHistory";
import { sendErrorMessage } from "../../../pluginUtils";
import { DAYS } from "../../../utils";
import { nameHistoryCmd } from "../types";

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
      sendErrorMessage(pluginData, msg.channel, "No name history found");
      return;
    }

    const nicknameRows = nicknames.map(
      r => `\`[${r.timestamp}]\` ${r.nickname ? `**${disableCodeBlocks(r.nickname)}**` : "*None*"}`,
    );
    const usernameRows = usernames.map(r => `\`[${r.timestamp}]\` **${disableCodeBlocks(r.username)}**`);

    const user = await pluginData.client.users.fetch(args.userId as Snowflake);
    const currentUsername = user ? `${user.username}#${user.discriminator}` : args.userId;

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
