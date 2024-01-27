import { BasePluginType, guildPluginEventListener } from "knub";
import z from "zod";
import { Queue } from "../../Queue";
import { UsernameHistory } from "../../data/UsernameHistory";

export const zUsernameSaverConfig = z.strictObject({});

export interface UsernameSaverPluginType extends BasePluginType {
  config: z.infer<typeof zUsernameSaverConfig>;
  state: {
    usernameHistory: UsernameHistory;
    updateQueue: Queue;
  };
}

export const usernameSaverEvt = guildPluginEventListener<UsernameSaverPluginType>();
