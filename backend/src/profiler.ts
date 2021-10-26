import { Profiler } from "knub/dist/Profiler";

let profiler: Profiler | null = null;

export function getProfiler() {
  return profiler;
}

export function setProfiler(_profiler: Profiler) {
  profiler = _profiler;
}
