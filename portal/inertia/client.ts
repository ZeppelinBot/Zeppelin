import { registry } from "#client/registry/index.js";
import { createTuyau } from "@tuyau/core/client";

export const client = createTuyau({
  baseUrl: "/",
  registry,
});

export const urlFor = client.urlFor;
