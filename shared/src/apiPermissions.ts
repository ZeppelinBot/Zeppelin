export enum ApiPermissions {
  Owner = "OWNER",
  ManageAccess = "MANAGE_ACCESS",
  EditConfig = "EDIT_CONFIG",
  ReadConfig = "READ_CONFIG",
  ViewGuild = "VIEW_GUILD",
}

const reverseApiPermissions = Object.entries(ApiPermissions).reduce((map, [key, value]) => {
  map[value] = key;
  return map;
}, {});

export const permissionNames = {
  [ApiPermissions.Owner]: "Server owner",
  [ApiPermissions.ManageAccess]: "Bot manager",
  [ApiPermissions.EditConfig]: "Bot operator",
  [ApiPermissions.ReadConfig]: "Read config",
  [ApiPermissions.ViewGuild]: "View server",
};

export type TPermissionHierarchy = Array<ApiPermissions | [ApiPermissions, TPermissionHierarchy]>;

// prettier-ignore
export const permissionHierarchy: TPermissionHierarchy = [
  [ApiPermissions.Owner, [
    [ApiPermissions.ManageAccess, [
      [ApiPermissions.EditConfig, [
        [ApiPermissions.ReadConfig, [
          ApiPermissions.ViewGuild,
        ]],
      ]],
    ]],
  ]],
];

export function permissionArrToSet(permissions: string[]): Set<ApiPermissions> {
  return new Set(permissions.filter((p) => reverseApiPermissions[p])) as Set<ApiPermissions>;
}

/**
 * Checks whether granted permissions include the specified permission, taking into account permission hierarchy i.e.
 * that in the case of nested permissions, having a top level permission implicitly grants you any permissions nested
 * under it as well
 */
export function hasPermission(grantedPermissions: Set<ApiPermissions>, permissionToCheck: ApiPermissions): boolean {
  // Directly granted
  if (grantedPermissions.has(permissionToCheck)) {
    return true;
  }

  // Check by hierarchy
  if (checkTreeForPermission(permissionHierarchy, grantedPermissions, permissionToCheck)) {
    return true;
  }

  return false;
}

function checkTreeForPermission(
  tree: TPermissionHierarchy,
  grantedPermissions: Set<ApiPermissions>,
  permission: ApiPermissions,
): boolean {
  for (const item of tree) {
    const [perm, nested] = Array.isArray(item) ? item : [item];

    // Top-level permission granted, implicitly grant all nested permissions as well
    if (grantedPermissions.has(perm)) {
      // Permission we were looking for was found nested under this permission -> granted
      if (nested && treeIncludesPermission(nested, permission)) {
        return true;
      }

      // Permission we were looking for was not found nested under this permission
      // Since direct grants are not handled by this function, we can skip any further checks for this nested tree
      continue;
    }

    // Top-level permission not granted, check further nested permissions
    if (nested && checkTreeForPermission(nested, grantedPermissions, permission)) {
      return true;
    }
  }

  return false;
}

function treeIncludesPermission(tree: TPermissionHierarchy, permission: ApiPermissions): boolean {
  for (const item of tree) {
    const [perm, nested] = Array.isArray(item) ? item : [item];

    if (perm === permission) {
      return true;
    }

    const nestedResult = nested && treeIncludesPermission(nested, permission);
    if (nestedResult) {
      return true;
    }
  }

  return false;
}
