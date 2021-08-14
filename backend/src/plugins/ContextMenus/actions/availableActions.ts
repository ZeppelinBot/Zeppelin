import * as t from "io-ts";
import { ContextActionBlueprint } from "../helpers";
import { CleanAction } from "./clean";
import { MuteAction } from "./mute";

export const availableActions: Record<string, ContextActionBlueprint<any>> = {
  mute: MuteAction,
  clean: CleanAction,
};

export const AvailableActions = t.type({
  mute: MuteAction.configType,
  clean: CleanAction.configType,
});

export const availableTypes: Record<string, string[]> = {
  mute: ["USER"],
  clean: ["MESSAGE"],
};
