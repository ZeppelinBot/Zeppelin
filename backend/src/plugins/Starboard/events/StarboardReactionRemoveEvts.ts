import { allStarboardsLock } from "../../../utils/lockNameHelpers";
import { starboardEvt } from "../types";

export const StarboardReactionRemoveEvt = starboardEvt({
  event: "messageReactionRemove",

  async listener(meta) {
    const boardLock = await meta.pluginData.locks.acquire(allStarboardsLock());
    await meta.pluginData.state.starboardReactions.deleteStarboardReaction(meta.args.message.id, meta.args.member.id);
    boardLock.unlock();
  },
});

export const StarboardReactionRemoveAllEvt = starboardEvt({
  event: "messageReactionRemoveAll",

  async listener(meta) {
    const boardLock = await meta.pluginData.locks.acquire(allStarboardsLock());
    await meta.pluginData.state.starboardReactions.deleteAllStarboardReactionsForMessageId(meta.args.message.id);
    boardLock.unlock();
  },
});
