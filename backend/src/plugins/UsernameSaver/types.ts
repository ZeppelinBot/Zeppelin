import { BasePluginType, guildPluginEventListener } from "knub";
import { Queue } from "../../Queue";
import { UsernameHistory } from "../../data/UsernameHistory";

export interface UsernameSaverPluginType extends BasePluginType {
  state: {
    usernameHistory: UsernameHistory;
    updateQueue: Queue;
  };
}

export const usernameSaverEvt = guildPluginEventListener<UsernameSaverPluginType>();
