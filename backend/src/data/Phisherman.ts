import { getRepository, Repository } from "typeorm";
import { PhishermanCacheEntry } from "./entities/PhishermanCacheEntry";
import { PhishermanDomainInfo, PhishermanUnknownDomain } from "./types/phisherman";
import fetch, { Headers } from "node-fetch";
import { DAYS, DBDateFormat, HOURS, MINUTES } from "../utils";
import moment from "moment-timezone";
import { PhishermanKeyCacheEntry } from "./entities/PhishermanKeyCacheEntry";
import crypto from "crypto";

const API_URL = "https://api.phisherman.gg";
const MASTER_API_KEY = process.env.PHISHERMAN_API_KEY;

let caughtDomainTrackingMap: Map<string, Map<string, number[]>> = new Map();

const pendingApiRequests: Map<string, Promise<unknown>> = new Map();
const pendingDomainInfoChecks: Map<string, Promise<PhishermanDomainInfo | null>> = new Map();

type MemoryCacheEntry = {
  info: PhishermanDomainInfo | null;
  expires: number;
};
const memoryCache: Map<string, MemoryCacheEntry> = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expires <= now) {
      memoryCache.delete(key);
    }
  }
}, 2 * MINUTES);

const UNKNOWN_DOMAIN_CACHE_LIFETIME = 2 * MINUTES;
const DETECTED_DOMAIN_CACHE_LIFETIME = 15 * MINUTES;
const SAFE_DOMAIN_CACHE_LIFETIME = 7 * DAYS;

const KEY_VALIDITY_LIFETIME = 24 * HOURS;

let cacheRepository: Repository<PhishermanCacheEntry> | null = null;
function getCacheRepository(): Repository<PhishermanCacheEntry> {
  if (cacheRepository == null) {
    cacheRepository = getRepository(PhishermanCacheEntry);
  }
  return cacheRepository;
}

let keyCacheRepository: Repository<PhishermanKeyCacheEntry> | null = null;
function getKeyCacheRepository(): Repository<PhishermanKeyCacheEntry> {
  if (keyCacheRepository == null) {
    keyCacheRepository = getRepository(PhishermanKeyCacheEntry);
  }
  return keyCacheRepository;
}

class PhishermanApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function hasPhishermanMasterAPIKey() {
  return MASTER_API_KEY != null && MASTER_API_KEY !== "";
}

export function phishermanDomainIsSafe(info: PhishermanDomainInfo): boolean {
  return info.classification === "safe";
}

const leadingSlashRegex = /^\/+/g;
function trimLeadingSlash(str: string): string {
  return str.replace(leadingSlashRegex, "");
}

/**
 * Make an arbitrary API call to the Phisherman API
 */
async function apiCall<T>(
  method: "GET" | "POST",
  resource: string,
  payload?: Record<string, unknown> | null,
): Promise<T> {
  if (!hasPhishermanMasterAPIKey()) {
    throw new Error("Phisherman master API key missing");
  }

  const url = `${API_URL}/${trimLeadingSlash(resource)}`;
  const key = `${method} ${url}`;

  if (pendingApiRequests.has(key)) {
    return pendingApiRequests.get(key)! as Promise<T>;
  }

  const requestPromise = (async () => {
    const response = await fetch(url, {
      method,
      headers: new Headers({
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${MASTER_API_KEY}`,
      }),
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || (data as any)?.success === false) {
      throw new PhishermanApiError(response.status, (data as any)?.message ?? "");
    }
    return data;
  })();
  requestPromise.finally(() => {
    pendingApiRequests.delete(key);
  });
  pendingApiRequests.set(key, requestPromise);
  return requestPromise as Promise<T>;
}

type DomainInfoApiCallResult = PhishermanUnknownDomain | PhishermanDomainInfo;
async function fetchDomainInfo(domain: string): Promise<PhishermanDomainInfo | null> {
  // tslint:disable-next-line:no-console
  console.log(`[PHISHERMAN] Requesting domain information: ${domain}`);
  const result = await apiCall<Record<string, DomainInfoApiCallResult>>("GET", `/v2/domains/info/${domain}`);
  const domainInfo = result[domain];
  if (domainInfo.classification === "unknown") {
    return null;
  }
  return domainInfo;
}

export async function getPhishermanDomainInfo(domain: string): Promise<PhishermanDomainInfo | null> {
  if (pendingDomainInfoChecks.has(domain)) {
    return pendingDomainInfoChecks.get(domain)!;
  }

  const promise = (async () => {
    if (memoryCache.has(domain)) {
      return memoryCache.get(domain)!.info;
    }

    const dbCache = getCacheRepository();
    const existingCachedEntry = await dbCache.findOne({ domain });
    if (existingCachedEntry) {
      return existingCachedEntry.data;
    }

    const freshData = await fetchDomainInfo(domain);
    const expiryTime =
      freshData === null
        ? UNKNOWN_DOMAIN_CACHE_LIFETIME
        : phishermanDomainIsSafe(freshData)
        ? SAFE_DOMAIN_CACHE_LIFETIME
        : DETECTED_DOMAIN_CACHE_LIFETIME;
    memoryCache.set(domain, {
      info: freshData,
      expires: Date.now() + expiryTime,
    });

    if (freshData) {
      // Database cache only stores safe/detected domains, not unknown ones
      await dbCache.insert({
        domain,
        data: freshData,
        expires_at: moment().add(expiryTime, "ms").format(DBDateFormat),
      });
    }

    return freshData;
  })();
  promise.finally(() => {
    pendingDomainInfoChecks.delete(domain);
  });
  pendingDomainInfoChecks.set(domain, promise);

  return promise;
}

export async function phishermanApiKeyIsValid(apiKey: string): Promise<boolean> {
  const keyCache = getKeyCacheRepository();
  const hash = crypto.createHash("sha256").update(apiKey).digest("hex");
  const entry = await keyCache.findOne({ hash });
  if (entry) {
    return entry.is_valid;
  }

  const { valid: isValid } = await apiCall<{ valid: boolean }>("POST", "/zeppelin/check-key", { apiKey });

  await keyCache.insert({
    hash,
    is_valid: isValid,
    expires_at: moment().add(KEY_VALIDITY_LIFETIME, "ms").format(DBDateFormat),
  });

  return isValid;
}

export function trackPhishermanCaughtDomain(apiKey: string, domain: string) {
  if (!caughtDomainTrackingMap.has(apiKey)) {
    caughtDomainTrackingMap.set(apiKey, new Map());
  }
  const apiKeyMap = caughtDomainTrackingMap.get(apiKey)!;
  if (!apiKeyMap.has(domain)) {
    apiKeyMap.set(domain, []);
  }
  const timestamps = apiKeyMap.get(domain)!;
  timestamps.push(Date.now());
}

export async function reportTrackedDomainsToPhisherman() {
  const result = {};
  for (const [apiKey, domains] of caughtDomainTrackingMap.entries()) {
    result[apiKey] = {};
    for (const [domain, timestamps] of domains.entries()) {
      result[apiKey][domain] = timestamps;
    }
  }

  if (Object.keys(result).length > 0) {
    await apiCall("POST", "/v2/phish/caught/bulk", result);
    caughtDomainTrackingMap = new Map();
  }
}

export async function deleteStalePhishermanCacheEntries() {
  await getCacheRepository().createQueryBuilder().where("expires_at <= NOW()").delete().execute();
}

export async function deleteStalePhishermanKeyCacheEntries() {
  await getKeyCacheRepository().createQueryBuilder().where("expires_at <= NOW()").delete().execute();
}
