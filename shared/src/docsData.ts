import data from "./docsData.json" with { type: "json" };
import type { ZeppelinDocsData } from "./docsDataTypes.js";

export const docsData = data as ZeppelinDocsData;
