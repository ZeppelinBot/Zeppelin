import { BasePluginType, guildPluginEventListener } from "knub";
import z from "zod/v4";
import { Queue } from "../../Queue.js";
import { UsernameHistory } from "../../data/UsernameHistory.js";

export const zUsernameSaverConfig = z.strictObject({});

export interface UsernameSaverPluginType extends BasePluginType {
  config: z.infer<typeof zUsernameSaverConfig>;
  state: {
    usernameHistory: UsernameHistory;
    updateQueue: Queue;
  };
}

export const usernameSaverEvt = guildPluginEventListener<UsernameSaverPluginType>();
