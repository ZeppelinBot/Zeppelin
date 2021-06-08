import { Permissions, TextChannel } from "discord.js";
import humanizeDuration from "humanize-duration";
import { commandTypeHelpers as ct } from "../../../commandTypes";
import { sendErrorMessage, sendSuccessMessage } from "../../../pluginUtils";
import { asSingleLine, DAYS, disableInlineCode, HOURS, MINUTES } from "../../../utils";
import { getMissingPermissions } from "../../../utils/getMissingPermissions";
import { missingPermissionError } from "../../../utils/missingPermissionError";
import { BOT_SLOWMODE_PERMISSIONS, NATIVE_SLOWMODE_PERMISSIONS } from "../requiredPermissions";
import { slowmodeCmd } from "../types";
import { actualDisableSlowmodeCmd } from "../util/actualDisableSlowmodeCmd";
import { disableBotSlowmodeForChannel } from "../util/disableBotSlowmodeForChannel";

const MAX_NATIVE_SLOWMODE = 6 * HOURS; // 6 hours
const MAX_BOT_SLOWMODE = DAYS * 365 * 100; // 100 years
const MIN_BOT_SLOWMODE = 15 * MINUTES;

const validModes = ["bot", "native"];
type TMode = "bot" | "native";

export const SlowmodeSetCmd = slowmodeCmd({
  trigger: "slowmode",
  permission: "can_manage",
  source: "guild",

  // prettier-ignore
  signature: [
    {
      time: ct.delay(),

      mode: ct.string({ option: true, shortcut: "m" }),
    },
    {
      channel: ct.textChannel(),
      time: ct.delay(),

      mode: ct.string({ option: true, shortcut: "m" }),
    }
  ],

  async run({ message: msg, args, pluginData }) {
    const channel: TextChannel = args.channel || msg.channel;

    if (args.time === 0) {
      // Workaround until we can call SlowmodeDisableCmd from here
      return actualDisableSlowmodeCmd(msg, { channel }, pluginData);
    }

    const defaultMode: TMode =
      (await pluginData.config.getForChannel(channel)).use_native_slowmode && args.time <= MAX_NATIVE_SLOWMODE
        ? "native"
        : "bot";

    const mode = (args.mode as TMode) || defaultMode;
    if (!validModes.includes(mode)) {
      sendErrorMessage(pluginData, msg.channel, "--mode must be 'bot' or 'native'");
      return;
    }

    // Validate durations
    if (mode === "native" && args.time > MAX_NATIVE_SLOWMODE) {
      sendErrorMessage(pluginData, msg.channel, "Native slowmode can only be set to 6h or less");
      return;
    }

    if (mode === "bot" && args.time > MAX_BOT_SLOWMODE) {
      sendErrorMessage(
        pluginData,
        msg.channel,
        `Sorry, bot managed slowmodes can be at most 100 years long. Maybe 99 would be enough?`,
      );
      return;
    }

    if (mode === "bot" && args.time < MIN_BOT_SLOWMODE) {
      sendErrorMessage(
        pluginData,
        msg.channel,
        asSingleLine(`
          Bot managed slowmode must be 15min or more.
          Use \`--mode native\` to use native slowmodes for short slowmodes instead.
        `),
      );
      return;
    }

    // Verify permissions
    const channelPermissions = channel.permissionsFor(pluginData.client.user!.id);

    if (mode === "native") {
      const missingPermissions = getMissingPermissions(
        channelPermissions ? channelPermissions : new Permissions(),
        NATIVE_SLOWMODE_PERMISSIONS,
      );
      if (missingPermissions) {
        sendErrorMessage(
          pluginData,
          msg.channel,
          `Unable to set native slowmode. ${missingPermissionError(missingPermissions)}`,
        );
        return;
      }
    }

    if (mode === "bot") {
      const missingPermissions = getMissingPermissions(
        channelPermissions ? channelPermissions : new Permissions(),
        BOT_SLOWMODE_PERMISSIONS,
      );
      if (missingPermissions) {
        sendErrorMessage(
          pluginData,
          msg.channel,
          `Unable to set bot managed slowmode. ${missingPermissionError(missingPermissions)}`,
        );
        return;
      }
    }

    // Apply the slowmode!
    const rateLimitSeconds = Math.ceil(args.time / 1000);

    if (mode === "native") {
      // If there is an existing bot-maintained slowmode, disable that first
      const existingBotSlowmode = await pluginData.state.slowmodes.getChannelSlowmode(channel.id);
      if (existingBotSlowmode) {
        await disableBotSlowmodeForChannel(pluginData, channel);
      }

      // Set native slowmode
      try {
        await channel.edit({
          rateLimitPerUser: rateLimitSeconds,
        });
      } catch (e) {
        sendErrorMessage(pluginData, msg.channel, `Failed to set native slowmode: ${disableInlineCode(e.message)}`);
        return;
      }
    } else {
      // If there is an existing native slowmode, disable that first
      if (channel.rateLimitPerUser) {
        await channel.edit({
          rateLimitPerUser: 0,
        });
      }

      await pluginData.state.slowmodes.setChannelSlowmode(channel.id, rateLimitSeconds);
    }

    const humanizedSlowmodeTime = humanizeDuration(args.time);
    const slowmodeType = mode === "native" ? "native slowmode" : "bot-maintained slowmode";
    sendSuccessMessage(
      pluginData,
      msg.channel,
      `Set ${humanizedSlowmodeTime} slowmode for <#${channel.id}> (${slowmodeType})`,
    );
  },
});
