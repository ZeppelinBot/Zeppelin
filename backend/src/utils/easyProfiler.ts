import { Profiler } from "knub/dist/Profiler";
import { performance } from "perf_hooks";
import { SECONDS } from "../utils";

export const startProfiling = (profiler: Profiler, key: string) => {
  const startTime = performance.now();
  return () => {
    profiler.addDataPoint(key, performance.now() - startTime);
  };
};

export const calculateBlocking = (coarseness = 10) => {
  let last = performance.now();
  let result = 0;
  const interval = setInterval(() => {
    const now = performance.now();
    const blockedTime = Math.max(0, now - last - coarseness);
    result += blockedTime;
    last = now;
  }, coarseness);

  setTimeout(() => clearInterval(interval), 10 * SECONDS);

  return () => {
    clearInterval(interval);
    return result;
  };
};
