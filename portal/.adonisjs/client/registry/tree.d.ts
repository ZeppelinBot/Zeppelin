/* eslint-disable prettier/prettier */
import type { routes } from "./index.ts";

export interface ApiDefinition {
  splash: {
    getIndex: (typeof routes)["splash.get_index"];
  };
}
