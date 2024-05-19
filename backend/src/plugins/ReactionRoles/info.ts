import { ZeppelinPluginInfo } from "../../types.js";
import { zReactionRolesConfig } from "./types.js";

export const reactionRolesPluginInfo: ZeppelinPluginInfo = {
  prettyName: "Reaction roles",
  description: "Consider using the [Role buttons](https://zeppelin.gg/docs/plugins/role_buttons) plugin instead.",
  type: "legacy",
  configSchema: zReactionRolesConfig,
};
