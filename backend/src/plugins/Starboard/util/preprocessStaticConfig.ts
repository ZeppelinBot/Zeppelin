import * as t from "io-ts";
import { defaultStarboardOpts, PartialConfigSchema } from "../types";

export function preprocessStaticConfig(config: t.TypeOf<typeof PartialConfigSchema>) {
  if (config.boards) {
    for (const [name, opts] of Object.entries(config.boards)) {
      config.boards[name] = Object.assign({}, defaultStarboardOpts, config.boards[name]);
    }
  }

  return config;
}
