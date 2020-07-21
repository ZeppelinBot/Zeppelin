import { BasePluginType, eventListener } from "knub";
import { UsernameHistory } from "src/data/UsernameHistory";
import { Queue } from "src/Queue";

export interface UsernameSaverPluginType extends BasePluginType {
  state: {
    usernameHistory: UsernameHistory;
    updateQueue: Queue;
  };
}

export const usernameEvent = eventListener<UsernameSaverPluginType>();
