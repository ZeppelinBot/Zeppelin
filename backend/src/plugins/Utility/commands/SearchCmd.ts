import { utilityCmd } from "../types";
import { baseTypeHelpers as t } from "knub";

export const SearchCmd = utilityCmd({
  trigger: ["search", "s"],

  signature: {
    query: t.string({ catchAll: true }),
  },

  run() {

  },
});
