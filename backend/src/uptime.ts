let start = 0;

export function startUptimeCounter() {
  start = Date.now();
}

export function getCurrentUptime() {
  return Date.now() - start;
}
