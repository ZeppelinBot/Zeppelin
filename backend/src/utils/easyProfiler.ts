import { Profiler } from "knub/dist/Profiler";
import { performance } from "perf_hooks";

export const startProfiling = (profiler: Profiler, key: string) => {
  const startTime = performance.now();
  return () => {
    profiler.addDataPoint(key, performance.now() - startTime);
  };
};
