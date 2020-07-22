import { starboardEvt } from "../types";

export const StarboardReactionRemoveEvt = starboardEvt({
  event: "messageReactionRemove",

  async listener(meta) {
    await meta.pluginData.state.starboardReactions.deleteStarboardReaction(meta.args.message.id, meta.args.userID);
  },
});

export const StarboardReactionRemoveAllEvt = starboardEvt({
  event: "messageReactionRemoveAll",

  async listener(meta) {
    await meta.pluginData.state.starboardReactions.deleteAllStarboardReactionsForMessageId(meta.args.message.id);
  },
});
