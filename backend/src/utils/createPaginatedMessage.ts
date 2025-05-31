import { Client, Message, MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";
import { ContextResponseOptions, fetchContextChannel, GenericCommandSource } from "../pluginUtils.js";
import { MINUTES, noop } from "../utils.js";
import { Awaitable } from "./typeUtils.js";
import Timeout = NodeJS.Timeout;

export type LoadPageFn = (page: number) => Awaitable<ContextResponseOptions>;

export interface PaginateMessageOpts {
  timeout: number;
  limitToUserId: string | null;
}

const defaultOpts: PaginateMessageOpts = {
  timeout: 5 * MINUTES,
  limitToUserId: null,
};

export async function createPaginatedMessage(
  client: Client,
  context: GenericCommandSource,
  totalPages: number,
  loadPageFn: LoadPageFn,
  opts: Partial<PaginateMessageOpts> = {},
): Promise<Message> {
  const fullOpts = { ...defaultOpts, ...opts } as PaginateMessageOpts;
  const channel = await fetchContextChannel(context);
  if (!channel.isSendable()) {
    throw new Error("Context channel is not sendable");
  }

  const firstPageContent = await loadPageFn(1);
  const message = await channel.send(firstPageContent);

  let page = 1;
  let pageLoadId = 0; // Used to avoid race conditions when rapidly switching pages
  const reactionListener = async (
    reactionMessage: MessageReaction | PartialMessageReaction,
    reactor: User | PartialUser,
  ) => {
    if (reactionMessage.message.id !== message.id) {
      return;
    }

    if (fullOpts.limitToUserId && reactor.id !== fullOpts.limitToUserId) {
      return;
    }

    if (reactor.id === client.user!.id) {
      return;
    }

    let pageDelta = 0;
    if (reactionMessage.emoji.name === "⬅️") {
      pageDelta = -1;
    } else if (reactionMessage.emoji.name === "➡️") {
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
    const thisPageLoadId = ++pageLoadId;
    const newPageContent = await loadPageFn(page);
    if (thisPageLoadId !== pageLoadId) {
      return;
    }

    message.edit(newPageContent).catch(noop);
    reactionMessage.users.remove(reactor.id).catch(noop);
    refreshTimeout();
  };
  client.on("messageReactionAdd", reactionListener);

  // The timeout after which reactions are removed and the pagination stops working
  // is refreshed each time the page is changed
  let timeout: Timeout;
  const refreshTimeout = () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      message.reactions.removeAll().catch(noop);
      client.off("messageReactionAdd", reactionListener);
    }, fullOpts.timeout);
  };

  refreshTimeout();

  // Add reactions
  message.react("⬅️").catch(noop);
  message.react("➡️").catch(noop);

  return message;
}
