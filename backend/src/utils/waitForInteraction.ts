import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageActionRowComponentBuilder,
  MessageComponentInteraction,
  MessageCreateOptions
} from "discord.js";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import { GenericCommandSource, isContextInteraction, sendContextResponse } from "../pluginUtils.js";
import { noop } from "../utils.js";

export async function waitForButtonConfirm(
  context: GenericCommandSource,
  toPost: Omit<MessageCreateOptions, "flags">,
  options?: WaitForOptions,
): Promise<boolean> {
  return new Promise(async (resolve) => {
    const contextIsInteraction = isContextInteraction(context);
    const idMod = `${context.id}-${moment.utc().valueOf()}`;
    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents([
      new ButtonBuilder()
        .setStyle(ButtonStyle.Success)
        .setLabel(options?.confirmText || "Confirm")
        .setCustomId(`confirmButton:${idMod}:${uuidv4()}`),

      new ButtonBuilder()
        .setStyle(ButtonStyle.Danger)
        .setLabel(options?.cancelText || "Cancel")
        .setCustomId(`cancelButton:${idMod}:${uuidv4()}`),
    ]);
    const message = await sendContextResponse(context, { ...toPost, components: [row] }, true);

    const collector = message.createMessageComponentCollector({ time: 10000 });

    collector.on("collect", (interaction: MessageComponentInteraction) => {
      if (options?.restrictToId && options.restrictToId !== interaction.user.id) {
        interaction
          .reply({ content: `You are not permitted to use these buttons.`, ephemeral: true })
          // tslint:disable-next-line no-console
          .catch((err) => console.trace(err.message));
      } else {
        if (interaction.customId.startsWith(`confirmButton:${idMod}:`)) {
          if (!contextIsInteraction) message.delete();
          resolve(true);
        } else if (interaction.customId.startsWith(`cancelButton:${idMod}:`)) {
          if (!contextIsInteraction) message.delete();
          resolve(false);
        }
      }
    });
    collector.on("end", () => {
      if (!contextIsInteraction && message.deletable) message.delete().catch(noop);
      resolve(false);
    });
  });
}

export interface WaitForOptions {
  restrictToId?: string;
  confirmText?: string;
  cancelText?: string;
}
