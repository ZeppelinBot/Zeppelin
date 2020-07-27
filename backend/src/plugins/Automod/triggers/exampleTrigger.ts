import * as t from "io-ts";
import { automodTrigger } from "../helpers";

export const ExampleTrigger = automodTrigger({
  configType: t.type({
    some: t.number,
    value: t.string,
  }),

  defaultConfig: {},

  matchResultType: t.type({
    thing: t.string,
  }),

  async match() {
    return {
      extra: {
        thing: "hi",
      },
    };
  },

  renderMatchInformation() {
    return "";
  },
});
