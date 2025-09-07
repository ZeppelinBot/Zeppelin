import { betterAuth } from "better-auth";

export const auth = betterAuth({
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      scope: ["identify", "email", "guilds"],
    },
  },
});
