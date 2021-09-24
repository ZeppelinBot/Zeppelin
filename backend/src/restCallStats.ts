import { sorter } from "./utils";

Error.stackTraceLimit = Infinity;

type CallStats = { method: string; path: string; source: string; count: number };
const restCallStats: Map<string, CallStats> = new Map();

const looseSnowflakeRegex = /\d{15,}/g;
const queryParamsRegex = /\?.*$/g;

export function logRestCall(method: string, path: string) {
  const anonymizedPath = path.replace(looseSnowflakeRegex, "0000").replace(queryParamsRegex, "");
  const stackLines = (new Error().stack || "").split("\n").slice(10); // Remove initial fluff
  const firstSrcLine = stackLines.findIndex((line) => line.includes("/backend/src"));
  const source = stackLines
    .slice(firstSrcLine !== -1 ? firstSrcLine : -5)
    .filter((l) => !l.includes("processTicksAndRejections"))
    .join("\n");
  const key = `${method}|${anonymizedPath}|${source}`;
  if (!restCallStats.has(key)) {
    restCallStats.set(key, {
      method,
      path: anonymizedPath,
      source,
      count: 0,
    });
  }
  restCallStats.get(key)!.count++;
}

export function getTopRestCallStats(count: number): CallStats[] {
  const stats = Array.from(restCallStats.values());
  stats.sort(sorter("count", "DESC"));
  return stats.slice(0, count);
}
