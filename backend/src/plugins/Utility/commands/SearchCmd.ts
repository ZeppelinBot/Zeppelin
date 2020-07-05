import { utilityCmd } from "../types";
import { baseTypeHelpers as t } from "knub";

export const SearchCmd = utilityCmd(
  ["search", "s"],
  {
    query: t.string({ catchAll: true }),

  },
  {},
  () => {}
);
