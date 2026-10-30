import { ApiLoginSchema } from "#database/schema";

export class ApiLogin extends ApiLoginSchema {
  static table = "api_logins";
}

export default ApiLogin;
