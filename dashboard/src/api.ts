import { RootStore } from "./store";
const apiUrl = process.env.API_URL;

type QueryParamObject = { [key: string]: string | null };

function buildQueryString(params: QueryParamObject) {
  if (Object.keys(params).length === 0) return "";

  return (
    "?" +
    Array.from(Object.entries(params))
      .map(pair => `${encodeURIComponent(pair[0])}=${encodeURIComponent(pair[1] || "")}`)
      .join("&")
  );
}

export function request(resource, fetchOpts: RequestInit = {}) {
  return fetch(`${apiUrl}/${resource}`, fetchOpts).then(res => res.json());
}

export function get(resource: string, params: QueryParamObject = {}) {
  const headers: Record<string, string> = RootStore.state.auth.apiKey
    ? { "X-Api-Key": RootStore.state.auth.apiKey }
    : {};
  return request(resource + buildQueryString(params), {
    method: "GET",
    headers,
  });
}

export function post(resource: string, params: QueryParamObject = {}) {
  const headers: Record<string, string> = RootStore.state.auth.apiKey
    ? { "X-Api-Key": RootStore.state.auth.apiKey }
    : {};
  return request(resource + buildQueryString(params), {
    method: "POST",
    body: JSON.stringify(params),
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });
}
