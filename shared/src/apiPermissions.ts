export enum ApiPermissions {
  Owner = "OWNER",
  ManageAccess = "MANAGE_ACCESS",
  EditConfig = "EDIT_CONFIG",
  ReadConfig = "READ_CONFIG",
}

interface IPermissionHierarchy extends Partial<Record<ApiPermissions, IPermissionHierarchy>> {}

export const permissionHierarchy: IPermissionHierarchy = {
  [ApiPermissions.Owner]: {
    [ApiPermissions.ManageAccess]: {
      [ApiPermissions.EditConfig]: {
        [ApiPermissions.ReadConfig]: {},
      },
    },
  },
};

/**
 * Checks whether granted permissions include the specified permission, taking into account permission hierarchy i.e.
 * that in the case of nested permissions, having a top level permission implicitly grants you any permissions nested
 * under it as well
 */
export function hasPermission(grantedPermissions: ApiPermissions[], permissionToCheck: ApiPermissions): boolean {
  // Directly granted
  if (grantedPermissions.includes(permissionToCheck)) {
    return true;
  }

  // Check by hierarchy
  if (checkTreeForPermission(permissionHierarchy, grantedPermissions, permissionToCheck)) {
    return true;
  }

  return false;
}

function checkTreeForPermission(
  tree: IPermissionHierarchy,
  grantedPermissions: ApiPermissions[],
  permission: ApiPermissions,
): boolean {
  for (const [perm, nested] of Object.entries(tree)) {
    // Top-level permission granted, implicitly grant all nested permissions as well
    if (grantedPermissions.includes(perm as ApiPermissions)) {
      // Permission we were looking for was found nested under this permission -> granted
      if (treeIncludesPermission(nested, permission)) {
        return true;
      }

      // Permission we were looking for was not found nested under this permission
      // Since direct grants are not handled by this function, we can skip any further checks for this nested tree
      continue;
    }

    // Top-level permission not granted, check further nested permissions
    if (checkTreeForPermission(nested, grantedPermissions, permission)) {
      return true;
    }
  }

  return false;
}

function treeIncludesPermission(tree: IPermissionHierarchy, permission: ApiPermissions): boolean {
  for (const [perm, nested] of Object.entries(tree)) {
    if (perm === permission) {
      return true;
    }

    const nestedResult = treeIncludesPermission(nested, permission);
    if (nestedResult) {
      return true;
    }
  }

  return false;
}
