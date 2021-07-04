import { MessageActionRow, MessageButton, MessageComponentInteraction, MessageOptions, TextChannel } from "discord.js";
import { noop } from "knub/dist/utils";
import moment from "moment";

export async function waitForButtonConfirm(
  channel: TextChannel,
  toPost: MessageOptions,
  options?: WaitForOptions,
): Promise<boolean> {
  return new Promise(async resolve => {
    const idMod = `${channel.guild.id}-${moment.utc().valueOf()}`;
    const row = new MessageActionRow().addComponents([
      new MessageButton()
        .setStyle("SUCCESS")
        .setLabel(options?.confirmText || "Confirm")
        .setCustomID(`confirmButton:${idMod}`),

      new MessageButton()
        .setStyle("DANGER")
        .setLabel(options?.cancelText || "Cancel")
        .setCustomID(`cancelButton:${idMod}`),
    ]);
    const message = await channel.send({ ...toPost, components: [row] });

    const filter = (iac: MessageComponentInteraction) => iac.message.id === message.id;
    const collector = message.createMessageComponentCollector({ filter, time: 10000 });

    collector.on("collect", (interaction: MessageComponentInteraction) => {
      if (options?.restrictToId && options.restrictToId !== interaction.user.id) {
        interaction.reply({ content: `You are not permitted to use these buttons.`, ephemeral: true });
      } else {
        if (interaction.customID === `confirmButton:${idMod}`) {
          message.delete();
          resolve(true);
        } else if (interaction.customID === `cancelButton:${idMod}`) {
          message.delete();
          resolve(false);
        }
      }
    });
    collector.on("end", () => {
      if (!message.deleted) message.delete().catch(noop);
      resolve(false);
    });
  });
}

export interface WaitForOptions {
  restrictToId?: string;
  confirmText?: string;
  cancelText?: string;
}
