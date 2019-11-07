import { ApiPermissions, hasPermission, TPermissionHierarchy } from "@shared/apiPermissions";

export type TPermissionHierarchyState = {
  locked: boolean;
  redundant: boolean;
};

export type TApiPermissionWithState = [ApiPermissions, TPermissionHierarchyState, TPermissionHierarchyWithState?];
export type TPermissionHierarchyWithState = TApiPermissionWithState[];

/**
 * @param tree
 * @param grantedPermissions Permissions granted to the user being edited
 * @param managerPermissions Permissions granted to the user who's editing the other user's permissions
 * @param entireTreeIsGranted
 */
export function applyStateToPermissionHierarchy(
  tree: TPermissionHierarchy,
  grantedPermissions: Set<ApiPermissions>,
  managerPermissions: Set<ApiPermissions> = new Set(),
  entireTreeIsGranted = false,
): TPermissionHierarchyWithState {
  const result: TPermissionHierarchyWithState = [];

  for (const item of tree) {
    const [perm, nested] = Array.isArray(item) ? item : [item];

    // Can't edit permissions you don't have yourself
    const locked = !hasPermission(managerPermissions, perm);
    const permissionWithState: TApiPermissionWithState = [perm, { locked, redundant: entireTreeIsGranted }];

    if (nested) {
      const subTreeGranted = entireTreeIsGranted || grantedPermissions.has(perm);
      permissionWithState.push(
        applyStateToPermissionHierarchy(nested, grantedPermissions, managerPermissions, subTreeGranted),
      );
    }

    result.push(permissionWithState);
  }

  return result;
}
