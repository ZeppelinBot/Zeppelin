import { ZeppelinPluginClass } from "./ZeppelinPluginClass";
import { ZeppelinPluginBlueprint } from "./ZeppelinPluginBlueprint";

// prettier-ignore
export type ZeppelinPlugin =
  | typeof ZeppelinPluginClass
  | ZeppelinPluginBlueprint;
