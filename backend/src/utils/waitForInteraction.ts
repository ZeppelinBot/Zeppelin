import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  Message,
  MessageActionRowComponentBuilder,
  MessageComponentInteraction,
  MessageCreateOptions,
  User,
} from "discord.js";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import { isContextInteraction } from "../pluginUtils";
import { noop } from "../utils";

export async function waitForButtonConfirm(
  context: Message | User | ChatInputCommandInteraction,
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
    const sendMethod = () => {
      return contextIsInteraction
        ? context.replied
          ? context.followUp
          : context.reply
        : "send" in context
        ? context.send
        : context.channel.send;
    };
    const extraParameters = contextIsInteraction ? { fetchReply: true } : {};
    const message = await sendMethod()({ ...toPost, components: [row], ...extraParameters });

    const collector = message.createMessageComponentCollector({ time: 10000 });

    collector.on("collect", (interaction: MessageComponentInteraction) => {
      if (options?.restrictToId && options.restrictToId !== interaction.user.id) {
        interaction
          .reply({ content: `You are not permitted to use these buttons.`, ephemeral: true })
          // tslint:disable-next-line no-console
          .catch((err) => console.trace(err.message));
      } else {
        if (interaction.customId.startsWith(`confirmButton:${idMod}:`)) {
          message.delete();
          resolve(true);
        } else if (interaction.customId.startsWith(`cancelButton:${idMod}:`)) {
          message.delete();
          resolve(false);
        }
      }
    });
    collector.on("end", () => {
      if (message.deletable) message.delete().catch(noop);
      resolve(false);
    });
  });
}

export interface WaitForOptions {
  restrictToId?: string;
  confirmText?: string;
  cancelText?: string;
}
