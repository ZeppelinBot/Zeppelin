import { contextMenuEvt } from "../types";
import { routeContextAction } from "../utils/contextRouter";

export const ContextClickedEvt = contextMenuEvt({
  event: "interactionCreate",

  async listener(meta) {
    if (!meta.args.interaction.isContextMenuCommand()) return;
    const inter = meta.args.interaction;
    await routeContextAction(meta.pluginData, inter);
  },
});
