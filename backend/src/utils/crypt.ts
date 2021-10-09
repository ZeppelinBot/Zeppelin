import { spawn, Worker, Pool } from "threads";
import "../loadEnv";
import type { CryptFns } from "./cryptWorker";

if (!process.env.KEY) {
  // tslint:disable-next-line:no-console
  console.error("Environment value KEY required for encryption");
  process.exit(1);
}

const KEY = process.env.KEY;
const pool = Pool(() => spawn(new Worker("./cryptWorker")), 8);

export async function encrypt(data: string) {
  return pool.queue((w) => w.encrypt(data, KEY));
}

export async function decrypt(data: string) {
  return pool.queue((w) => w.decrypt(data, KEY));
}
