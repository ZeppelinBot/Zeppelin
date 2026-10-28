import { ConfigSchema } from "#database/schema";

export class Config extends ConfigSchema {
  static table = "configs";
}

export default Config;
