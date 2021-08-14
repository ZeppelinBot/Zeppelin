import { ContextMenuInteraction } from "discord.js";
import { contextMenuEvt } from "../types";
import { routeContextAction } from "../utils/contextRouter";

export const ContextClickedEvt = contextMenuEvt({
  event: "interactionCreate",

  async listener(meta) {
    if (!meta.args.interaction.isContextMenu) return;
    const inter = meta.args.interaction as ContextMenuInteraction;
    await routeContextAction(meta.pluginData, inter);
  },
});
