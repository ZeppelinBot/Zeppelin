import * as t from "io-ts";
import { automodAction } from "../helpers";

export const ExampleAction = automodAction({
  configType: t.type({
    someValue: t.string,
  }),

  defaultConfig: {},

  async apply({ pluginData, contexts, actionConfig }) {
    // TODO: Everything
  },
});
