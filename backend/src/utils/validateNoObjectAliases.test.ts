import test from "ava";
import { ObjectAliasError, validateNoObjectAliases } from "./validateNoObjectAliases";

test("validateNoObjectAliases() disallows object aliases at top level", (t) => {
  const obj: any = {
    objectRef: {
      foo: "bar",
    },
  };
  obj.otherProp = obj.objectRef;

  t.throws(() => validateNoObjectAliases(obj), { instanceOf: ObjectAliasError });
});

test("validateNoObjectAliases() disallows aliases to nested objects", (t) => {
  const obj: any = {
    nested: {
      objectRef: {
        foo: "bar",
      },
    },
  };
  obj.otherProp = obj.nested.objectRef;

  t.throws(() => validateNoObjectAliases(obj), { instanceOf: ObjectAliasError });
});

test("validateNoObjectAliases() disallows nested object aliases", (t) => {
  const obj: any = {
    nested: {
      objectRef: {
        foo: "bar",
      },
    },
  };
  obj.otherProp = {
    alsoNested: {
      ref: obj.nested.objectRef,
    },
  };

  t.throws(() => validateNoObjectAliases(obj), { instanceOf: ObjectAliasError });
});
