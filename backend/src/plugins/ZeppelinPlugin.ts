import { ZeppelinGlobalPluginBlueprint, ZeppelinGuildPluginBlueprint } from "./ZeppelinPluginBlueprint";

export type ZeppelinPlugin = ZeppelinGuildPluginBlueprint<any> | ZeppelinGlobalPluginBlueprint<any>;
