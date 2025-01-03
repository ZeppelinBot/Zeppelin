import { escapeInlineCode, PermissionsBitField } from "discord.js";
import { commandTypeHelpers as ct } from "../../../commandTypes.js";
import { humanizeDuration } from "../../../humanizeDuration.js";
import { asSingleLine, DAYS, HOURS, MINUTES } from "../../../utils.js";
import { getMissingPermissions } from "../../../utils/getMissingPermissions.js";
import { missingPermissionError } from "../../../utils/missingPermissionError.js";
import { BOT_SLOWMODE_PERMISSIONS, NATIVE_SLOWMODE_PERMISSIONS } from "../requiredPermissions.js";
import { slowmodeCmd } from "../types.js";
import { actualDisableSlowmodeCmd } from "../util/actualDisableSlowmodeCmd.js";
import { disableBotSlowmodeForChannel } from "../util/disableBotSlowmodeForChannel.js";

const MAX_NATIVE_SLOWMODE = 6 * HOURS; // 6 hours
const MAX_BOT_SLOWMODE = DAYS * 365 * 100; // 100 years
const MIN_BOT_SLOWMODE = 15 * MINUTES;

const validModes = ["bot", "native"];
type TMode = "bot" | "native";

export const SlowmodeSetCmd = slowmodeCmd({
  trigger: "slowmode",
  permission: "can_manage",
  source: "guild",

  signature: [
    {
      time: ct.delay(),

      mode: ct.string({ option: true, shortcut: "m" }),
    },
    {
      channel: ct.textChannel(),
      time: ct.delay(),

      mode: ct.string({ option: true, shortcut: "m" }),
    },
  ],

  async run({ message: msg, args, pluginData }) {
    const channel = args.channel || msg.channel;

    if (!channel.isTextBased() || channel.isThread()) {
      void pluginData.state.common.sendErrorMessage(msg, "Slowmode can only be set on non-thread text-based channels");
      return;
    }

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
      void pluginData.state.common.sendErrorMessage(msg, "--mode must be 'bot' or 'native'");
      return;
    }

    // Validate durations
    if (mode === "native" && args.time > MAX_NATIVE_SLOWMODE) {
      void pluginData.state.common.sendErrorMessage(msg, "Native slowmode can only be set to 6h or less");
      return;
    }

    if (mode === "bot" && args.time > MAX_BOT_SLOWMODE) {
      void pluginData.state.common.sendErrorMessage(
        msg,
        `Sorry, bot managed slowmodes can be at most 100 years long. Maybe 99 would be enough?`,
      );
      return;
    }

    if (mode === "bot" && args.time < MIN_BOT_SLOWMODE) {
      void pluginData.state.common.sendErrorMessage(
        msg,
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
        channelPermissions ?? new PermissionsBitField(),
        NATIVE_SLOWMODE_PERMISSIONS,
      );
      if (missingPermissions) {
        void pluginData.state.common.sendErrorMessage(
          msg,
          `Unable to set native slowmode. ${missingPermissionError(missingPermissions)}`,
        );
        return;
      }
    }

    if (mode === "bot") {
      const missingPermissions = getMissingPermissions(
        channelPermissions ?? new PermissionsBitField(),
        BOT_SLOWMODE_PERMISSIONS,
      );
      if (missingPermissions) {
        void pluginData.state.common.sendErrorMessage(
          msg,
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
      if (existingBotSlowmode && channel.isTextBased()) {
        await disableBotSlowmodeForChannel(pluginData, channel);
      }

      // Set native slowmode
      try {
        await channel.setRateLimitPerUser(rateLimitSeconds);
      } catch (e) {
        void pluginData.state.common.sendErrorMessage(
          msg,
          `Failed to set native slowmode: ${escapeInlineCode(e.message)}`,
        );
        return;
      }
    } else {
      // If there is an existing native slowmode, disable that first
      if (channel.rateLimitPerUser) {
        await channel.setRateLimitPerUser(0);
      }

      // Set bot-maintained slowmode
      await pluginData.state.slowmodes.setChannelSlowmode(channel.id, rateLimitSeconds);

      // Update cache
      const slowmode = await pluginData.state.slowmodes.getChannelSlowmode(channel.id);
      pluginData.state.channelSlowmodeCache.set(channel.id, slowmode ?? null);
    }

    const humanizedSlowmodeTime = humanizeDuration(args.time);
    const slowmodeType = mode === "native" ? "native slowmode" : "bot-maintained slowmode";
    void pluginData.state.common.sendSuccessMessage(
      msg,
      `Set ${humanizedSlowmodeTime} slowmode for <#${channel.id}> (${slowmodeType})`,
    );
  },
});
