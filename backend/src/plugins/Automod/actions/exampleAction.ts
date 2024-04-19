import z from "zod";
import { zBoundedCharacters } from "../../../utils";
import { automodAction } from "../helpers";

export const ExampleAction = automodAction({
  configSchema: z.strictObject({
    someValue: zBoundedCharacters(0, 1000),
  }),

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async apply({ pluginData, contexts, actionConfig }) {
    // TODO: Everything
  },
});
