import { defineEventHandler, toWebRequest } from "#imports";
import { auth } from "../../features/auth/betterAuth";

export default defineEventHandler((event) => {
  return auth.handler(toWebRequest(event));
});
