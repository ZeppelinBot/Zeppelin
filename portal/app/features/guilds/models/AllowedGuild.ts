import { AllowedGuildSchema } from "#database/schema";

export class AllowedGuild extends AllowedGuildSchema {
  static table = "allowed_guilds";
}

export default AllowedGuild;
