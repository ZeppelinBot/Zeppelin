import { ApiUserInfoSchema } from "#database/schema";

export class ApiUserInfo extends ApiUserInfoSchema {
  static table = "api_user_info";
}

export default ApiUserInfo;
