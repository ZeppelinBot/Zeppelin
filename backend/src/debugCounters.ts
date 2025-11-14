type DebugCounterValue = {
  count: number;
};
const debugCounterValueMap = new Map<string, DebugCounterValue>();

export function incrementDebugCounter(name: string) {
  if (!debugCounterValueMap.has(name)) {
    debugCounterValueMap.set(name, { count: 0 });
  }
  debugCounterValueMap.get(name)!.count++;
}

export function getDebugCounterValues() {
  return debugCounterValueMap;
}
