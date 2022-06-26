import { RootStore } from "./store";
const apiUrl = process.env.API_URL;

type QueryParamObject = { [key: string]: string | null };

export class ApiError extends Error {
  public body: any;
  public status: number;
  public res: Response;

  constructor(message: string, body: object, status: number, res: Response) {
    super(message);
    this.body = body;
    this.status = status;
    this.res = res;
  }
}

function buildQueryString(params: QueryParamObject) {
  if (Object.keys(params).length === 0) return "";

  return (
    "?" +
    Array.from(Object.entries(params))
      .map((pair) => `${encodeURIComponent(pair[0])}=${encodeURIComponent(pair[1] || "")}`)
      .join("&")
  );
}

export function request(resource, fetchOpts: RequestInit = {}) {
  return fetch(`${apiUrl}/${resource}`, fetchOpts).then(async (res) => {
    if (!res.ok) {
      if (res.status === 401) {
        RootStore.dispatch("auth/expiredLogin");
        return;
      }

      const body = await res.json();
      throw new ApiError(res.statusText, body, res.status, res);
    }

    return res.json();
  });
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
  return request(resource, {
    method: "POST",
    body: JSON.stringify(params),
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });
}

type FormPostOpts = {
  target?: string;
};

export function formPost(resource: string, body: Record<any, any> = {}, opts: FormPostOpts = {}) {
  body["X-Api-Key"] = RootStore.state.auth.apiKey;
  const form = document.createElement("form");
  form.action = `${apiUrl}/${resource}`;
  form.method = "POST";
  form.enctype = "multipart/form-data";
  if (opts.target != null) {
    form.target = opts.target;
  }
  for (const [key, value] of Object.entries(body)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();

  setTimeout(() => {
    document.body.removeChild(form);
  }, 1);
}
