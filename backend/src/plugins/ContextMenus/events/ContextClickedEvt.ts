import { contextMenuEvt } from "../types.js";
import { routeContextAction } from "../utils/contextRouter.js";

export const ContextClickedEvt = contextMenuEvt({
  event: "interactionCreate",

  async listener(meta) {
    if (!meta.args.interaction.isContextMenuCommand()) return;
    const inter = meta.args.interaction;
    await routeContextAction(meta.pluginData, inter);
  },
});
