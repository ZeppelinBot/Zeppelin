import { spawn, Worker } from "threads";
import "../loadEnv";
import type { CryptFns } from "./cryptWorker";

if (!process.env.KEY) {
  // tslint:disable-next-line:no-console
  console.error("Environment value KEY required for encryption");
  process.exit(1);
}

const KEY = process.env.KEY;
let workerPromise: Promise<CryptFns> | null = null;

async function getWorker(): Promise<CryptFns> {
  if (workerPromise == null) {
    workerPromise = spawn(new Worker("./cryptWorker")) as unknown as Promise<CryptFns>;
  }
  return workerPromise;
}

export async function encrypt(data: string) {
  return (await getWorker()).encrypt(data, KEY);
}

export async function decrypt(data: string) {
  return (await getWorker()).decrypt(data, KEY);
}
