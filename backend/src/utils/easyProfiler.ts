import type { Knub } from "knub";
import { performance } from "perf_hooks";
import { noop, SECONDS } from "../utils";

type Profiler = Knub["profiler"];

let _profilingEnabled = false;

export const profilingEnabled = () => {
  return _profilingEnabled;
};

export const enableProfiling = () => {
  _profilingEnabled = true;
};

export const disableProfiling = () => {
  _profilingEnabled = false;
};

export const startProfiling = (profiler: Profiler, key: string) => {
  if (!profilingEnabled()) {
    return noop;
  }

  const startTime = performance.now();
  return () => {
    profiler.addDataPoint(key, performance.now() - startTime);
  };
};

export const calculateBlocking = (coarseness = 10) => {
  if (!profilingEnabled()) {
    return () => 0;
  }

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
