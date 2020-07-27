import * as t from "io-ts";
import { CleanAction } from "./clean";
import { AutomodActionBlueprint } from "../helpers";

export const availableActions: Record<string, AutomodActionBlueprint<any>> = {
  clean: CleanAction,
};

export const AvailableActions = t.type({
  clean: CleanAction.configType,
});
