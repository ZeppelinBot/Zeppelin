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

let apiKey = null;
export function setApiKey(newKey) {
  apiKey = newKey;
}
export function hasApiKey() {
  return apiKey != null;
}
export function resetApiKey() {
  apiKey = null;
}

export function request(resource, fetchOpts: RequestInit = {}) {
  return fetch(`${apiUrl}/${resource}`, fetchOpts)
    .then(res => res.json())
    .catch(err => {
      console.log(err);
    });
}

export function get(resource: string, params: QueryParamObject = {}) {
  const headers: Record<string, string> = apiKey ? { "X-Api-Key": (apiKey as unknown) as string } : {};
  return request(resource + buildQueryString(params), {
    method: "GET",
    headers,
  });
}

export function post(resource: string, params: QueryParamObject = {}) {
  const headers: Record<string, string> = apiKey ? { "X-Api-Key": (apiKey as unknown) as string } : {};
  return request(resource + buildQueryString(params), {
    method: "POST",
    body: JSON.stringify(params),
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });
}
