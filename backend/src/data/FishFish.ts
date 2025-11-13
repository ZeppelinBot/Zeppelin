import { z } from "zod";
import { env } from "../env.js";
import { HOURS, MINUTES, SECONDS } from "../utils.js";

const API_ROOT = "https://api.fishfish.gg/v1";

const zDomainCategory = z.literal(["safe", "malware", "phishing"]);

const zDomain = z.object({
  name: z.string(),
  category: zDomainCategory,
  description: z.string(),
  added: z.number(),
  checked: z.number(),
});
export type FishFishDomain = z.output<typeof zDomain>;

const FULL_REFRESH_INTERVAL = 6 * HOURS;
const domains = new Map<string, FishFishDomain>();

let sessionTokenPromise: Promise<string> | null = null;

const WS_RECONNECT_DELAY = 30 * SECONDS;
let updatesWs: WebSocket | null = null;

export class FishFishError extends Error {}

const zTokenResponse = z.object({
  expires: z.number(),
  token: z.string(),
});

async function getSessionToken(): Promise<string> {
  if (sessionTokenPromise) {
    return sessionTokenPromise;
  }

  const apiKey = env.FISHFISH_API_KEY;
  if (!apiKey) {
    throw new FishFishError("FISHFISH_API_KEY is missing");
  }

  sessionTokenPromise = (async () => {
    const response = await fetch(`${API_ROOT}/users/@me/tokens`, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new FishFishError(`Failed to get session token: ${response.status} ${response.statusText}`);
    }

    const parseResult = zTokenResponse.safeParse(await response.json());
    if (!parseResult.success) {
      throw new FishFishError(`Parse error when fetching session token: ${parseResult.error.message}`);
    }

    const timeUntilExpiry = parseResult.data.expires * 1000 - Date.now();
    setTimeout(
      () => {
        sessionTokenPromise = null;
      },
      timeUntilExpiry - 1 * MINUTES,
    ); // Subtract a minute to ensure we refresh before expiry

    return parseResult.data.token;
  })();
  sessionTokenPromise.catch((err) => {
    sessionTokenPromise = null;
    throw err;
  });

  return sessionTokenPromise;
}

async function fishFishApiCall(method: string, path: string, query: Record<string, string> = {}): Promise<unknown> {
  const sessionToken = await getSessionToken();
  const queryParams = new URLSearchParams(query);
  const response = await fetch(`https://api.fishfish.gg/v1/${path}?${queryParams}`, {
    method,
    headers: {
      Authorization: sessionToken,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new FishFishError(`FishFish API call failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function refreshFishFishDomains() {
  const rawData = await fishFishApiCall("GET", "domains", { full: "true" });
  const parseResult = z.array(zDomain).safeParse(rawData);
  if (!parseResult.success) {
    throw new FishFishError(`Parse error when refreshing domains: ${parseResult.error.message}`);
  }

  domains.clear();
  for (const domain of parseResult.data) {
    domains.set(domain.name, domain);
  }

  domains.set("malware-link.test.zeppelin.gg", {
    name: "malware-link.test.zeppelin.gg",
    category: "malware",
    description: "",
    added: Date.now(),
    checked: Date.now(),
  });
  domains.set("phishing-link.test.zeppelin.gg", {
    name: "phishing-link.test.zeppelin.gg",
    category: "phishing",
    description: "",
    added: Date.now(),
    checked: Date.now(),
  });
  domains.set("safe-link.test.zeppelin.gg", {
    name: "safe-link.test.zeppelin.gg",
    category: "safe",
    description: "",
    added: Date.now(),
    checked: Date.now(),
  });

  console.log("[FISHFISH] Refreshed FishFish domains, total count:", domains.size);
}

export async function initFishFish() {
  if (!env.FISHFISH_API_KEY) {
    console.warn("[FISHFISH] FISHFISH_API_KEY is not set, FishFish functionality will be disabled.");
    return;
  }

  await refreshFishFishDomains();
  // Real-time updates disabled until we switch to a WebSocket lib that supports authorization headers
  // void subscribeToFishFishUpdates();
  setInterval(() => refreshFishFishDomains(), FULL_REFRESH_INTERVAL);
}

export function getFishFishDomain(domain: string): FishFishDomain | undefined {
  return domains.get(domain.toLowerCase());
}
