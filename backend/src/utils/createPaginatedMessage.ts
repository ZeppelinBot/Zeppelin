import {
  Constants,
  Message,
  MessageActionRow,
  MessageButton,
  MessageEditOptions,
  MessageOptions,
  TextChannel,
  User,
} from "discord.js";
import { Awaitable } from "knub/dist/utils";
import { MINUTES, noop } from "../utils";

export type LoadPageFn = (page: number) => Awaitable<MessageOptions & MessageEditOptions>;

export interface PaginateMessageOpts {
  timeout: number;
  limitToUserId: string | null;
}

const defaultOpts: PaginateMessageOpts = {
  timeout: 5 * MINUTES,
  limitToUserId: null,
};

const forwardId = "forward" as const;
const backwardId = "backward" as const;

export async function createPaginatedMessage(
  channel: TextChannel | User,
  totalPages: number,
  loadPageFn: LoadPageFn,
  opts: Partial<PaginateMessageOpts> = {},
): Promise<Message> {
  const fullOpts = { ...defaultOpts, ...opts } as PaginateMessageOpts;
  const firstPageContent = await loadPageFn(1);

  const components: MessageButton[] = [
    new MessageButton({
      customId: backwardId,
      emoji: "⬅",
      style: Constants.MessageButtonStyles.SECONDARY,
    }),
    new MessageButton({
      customId: forwardId,
      emoji: "➡",
      style: Constants.MessageButtonStyles.SECONDARY,
    }),
  ];

  const message = await channel.send({ ...firstPageContent, components: [new MessageActionRow({ components })] });

  let page = 1;

  const collector = message.createMessageComponentCollector({ time: fullOpts.timeout });

  collector.on("collect", async (interaction) => {
    if (fullOpts.limitToUserId && interaction.user.id !== fullOpts.limitToUserId) {
      return interaction.reply({ content: `You are not permitted to use these buttons.`, ephemeral: true });
    }

    await interaction.deferUpdate();

    let pageDelta = 0;
    if (interaction.customId === backwardId) {
      pageDelta = -1;
    } else if (interaction.customId === forwardId) {
      pageDelta = 1;
    }

    if (!pageDelta) {
      return;
    }

    const newPage = Math.max(Math.min(page + pageDelta, totalPages), 1);
    if (newPage === page) {
      return;
    }

    page = newPage;
    void message.edit(await loadPageFn(page)).catch(noop);
  });

  collector.on("end", () => {
    message.edit({ components: [] });
  });

  return message;
}
