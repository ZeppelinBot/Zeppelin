import { ApiPermissions, hasPermission } from "./apiPermissions";
import test from "ava";

test("Directly granted permissions match", t => {
  t.is(hasPermission([ApiPermissions.ManageAccess], ApiPermissions.ManageAccess), true);
  t.is(hasPermission([ApiPermissions.ManageAccess], ApiPermissions.Owner), false);
});

test("Implicitly granted permissions by hierarchy match", t => {
  t.is(hasPermission([ApiPermissions.ManageAccess], ApiPermissions.EditConfig), true);
  t.is(hasPermission([ApiPermissions.ManageAccess], ApiPermissions.ReadConfig), true);
  t.is(hasPermission([ApiPermissions.EditConfig], ApiPermissions.ManageAccess), false);
});
