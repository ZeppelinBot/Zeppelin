import * as t from "io-ts";
import { automodAction } from "../helpers";

export const ExampleAction = automodAction({
  configType: t.type({
    someValue: t.string,
  }),

  defaultConfig: {},

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async apply({ pluginData, contexts, actionConfig }) {
    // TODO: Everything
  },
});
