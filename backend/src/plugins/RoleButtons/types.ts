import { ButtonStyle } from "discord.js";
import { BasePluginType, pluginUtils } from "vety";
import { z } from "zod";
import { GuildRoleButtons } from "../../data/GuildRoleButtons.js";
import { zBoundedCharacters, zBoundedRecord, zMessageContent, zSnowflake } from "../../utils.js";
import { CommonPlugin } from "../Common/CommonPlugin.js";
import { TooManyComponentsError } from "./functions/TooManyComponentsError.js";
import { createButtonComponents } from "./functions/createButtonComponents.js";

const zRoleButtonOption = z.strictObject({
  role_id: zSnowflake,
  label: z.string().nullable().default(null),
  emoji: z.string().nullable().default(null),
  // https://discord.js.org/#/docs/discord.js/v13/typedef/MessageButtonStyle
  style: z
    .union([
      z.literal(ButtonStyle.Primary),
      z.literal(ButtonStyle.Secondary),
      z.literal(ButtonStyle.Success),
      z.literal(ButtonStyle.Danger),

      // The following are deprecated
      z.literal("PRIMARY"),
      z.literal("SECONDARY"),
      z.literal("SUCCESS"),
      z.literal("DANGER"),
      // z.literal("LINK"), // Role buttons don't use link buttons, but adding this here so it's documented why it's not available
    ])
    .nullable()
    .default(null),
  start_new_row: z.boolean().default(false),
});
export type TRoleButtonOption = z.infer<typeof zRoleButtonOption>;

const zRoleButtonsConfigItem = z
  .strictObject({
    message: z.union([
      z.strictObject({
        channel_id: zSnowflake,
        message_id: zSnowflake,
      }),
      z.strictObject({
        channel_id: zSnowflake,
        content: zMessageContent,
      }),
    ]),
    add_message: zMessageContent.optional(),
    remove_message: zMessageContent.optional(),
    options: z.array(zRoleButtonOption).max(25),
    exclusive: z.boolean().default(false),
  })
  .refine(
    (parsed) => {
      try {
        createButtonComponents(parsed, "test"); // We can use any configName here
      } catch (err) {
        if (err instanceof TooManyComponentsError) {
          return false;
        }
        throw err;
      }
      return true;
    },
    {
      message: "Too many options; can only have max 5 buttons per row on max 5 rows.",
    },
  );
export type TRoleButtonsConfigItem = z.infer<typeof zRoleButtonsConfigItem>;

export const zRoleButtonsConfig = z
  .strictObject({
    buttons: zBoundedRecord(z.record(zBoundedCharacters(1, 16), zRoleButtonsConfigItem), 0, 100).default({}),
    can_reset: z.boolean().default(false),
  })
  .refine(
    (parsed) => {
      const seenMessages = new Set();
      for (const button of Object.values(parsed.buttons)) {
        if (button.message) {
          if ("message_id" in button.message) {
            if (seenMessages.has(button.message.message_id)) {
              return false;
            }
            seenMessages.add(button.message.message_id);
          }
        }
      }
      return true;
    },
    {
      message: "Can't target the same message with two sets of role buttons",
    },
  );

export interface RoleButtonsPluginType extends BasePluginType {
  configSchema: typeof zRoleButtonsConfig;
  state: {
    roleButtons: GuildRoleButtons;
    common: pluginUtils.PluginPublicInterface<typeof CommonPlugin>;
  };
}
