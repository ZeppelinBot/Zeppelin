import { ApiPermissionSchema } from "#database/schema";

export class ApiPermission extends ApiPermissionSchema {
  static table = "api_permissions";
}

export default ApiPermission;
