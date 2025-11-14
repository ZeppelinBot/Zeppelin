import { BasePluginType, guildPluginEventListener } from "vety";
import { z } from "zod";
import { Queue } from "../../Queue.js";
import { UsernameHistory } from "../../data/UsernameHistory.js";

export const zUsernameSaverConfig = z.strictObject({});

export interface UsernameSaverPluginType extends BasePluginType {
  configSchema: typeof zUsernameSaverConfig;
  state: {
    usernameHistory: UsernameHistory;
    updateQueue: Queue;
  };
}

export const usernameSaverEvt = guildPluginEventListener<UsernameSaverPluginType>();
