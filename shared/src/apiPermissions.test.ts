import { ApiPermissions, hasPermission } from "./apiPermissions";
import test from "ava";

test("Directly granted permissions match", (t) => {
  t.is(hasPermission(new Set([ApiPermissions.ManageAccess]), ApiPermissions.ManageAccess), true);
  t.is(hasPermission(new Set([ApiPermissions.ManageAccess]), ApiPermissions.Owner), false);
});

test("Implicitly granted permissions by hierarchy match", (t) => {
  t.is(hasPermission(new Set([ApiPermissions.ManageAccess]), ApiPermissions.EditConfig), true);
  t.is(hasPermission(new Set([ApiPermissions.ManageAccess]), ApiPermissions.ReadConfig), true);
  t.is(hasPermission(new Set([ApiPermissions.EditConfig]), ApiPermissions.ManageAccess), false);
});
