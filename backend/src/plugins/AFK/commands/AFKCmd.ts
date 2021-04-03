import { afkCmd } from "../types";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { parseStatusMessage } from "../functions/parseStatusMessage";

export const AfkSetCmd = afkCmd({
  trigger: ["afk", "afk set"],
  permission: "can_afk",

  signature: {
    status: ct.string({ rest: true, required: true }),
  },

  async run({ message: msg, args, pluginData }) {
    // Checks if the user is AFK, if so, return.
    const isAfk = await pluginData.state.afkUsers.getUserAFKStatus(msg.author.id);
    if (isAfk) return;

    const status = args.status.join(" ");

    // Check status length
    if (status.length > 124) {
      sendErrorMessage(pluginData, msg.channel, "Status length is above **124** characters.");
      return;
    }

    // Checks status based on configuration options
    const parsed = parseStatusMessage(pluginData, msg.member, status);
    if (typeof parsed === "string") {
      sendErrorMessage(pluginData, msg.channel, parsed);
      return;
    }

    // Set user status
    const afk = await pluginData.state.afkUsers.setAfkStatus(msg.author.id, status);

    sendSuccessMessage(pluginData, msg.channel, `AFK Status set to: **${afk.status}**`, {
      roles: false,
      everyone: false,
      users: false,
    });
  },
});
