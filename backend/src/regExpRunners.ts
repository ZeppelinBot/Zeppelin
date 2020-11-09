import { RegExpRunner } from "./RegExpRunner";

interface RunnerInfo {
  users: number;
  runner: RegExpRunner;
}

const runners: Map<string, RunnerInfo> = new Map();

export function getRegExpRunner(key: string) {
  if (!runners.has(key)) {
    const runner = new RegExpRunner();
    runners.set(key, {
      users: 0,
      runner,
    });
  }

  const info = runners.get(key)!;
  info.users++;

  return info.runner;
}

export function discardRegExpRunner(key: string) {
  if (!runners.has(key)) {
    throw new Error(`No runners with key ${key}, cannot discard`);
  }

  const info = runners.get(key)!;
  info.users--;

  if (info.users <= 0) {
    info.runner.dispose();
    runners.delete(key);
  }
}
