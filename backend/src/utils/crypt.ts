import { spawn, Worker, Pool } from "threads";
import type { CryptFns } from "./cryptWorker";
import { MINUTES } from "../utils";
import { env } from "../env";

const pool = Pool(() => spawn(new Worker("./cryptWorker"), { timeout: 10 * MINUTES }), 8);

export async function encrypt(data: string) {
  return pool.queue((w) => w.encrypt(data, env.KEY));
}

export async function decrypt(data: string) {
  return pool.queue((w) => w.decrypt(data, env.KEY));
}
