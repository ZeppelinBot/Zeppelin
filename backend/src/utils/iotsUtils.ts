import * as t from "io-ts";

interface BoundedStringBrand {
  readonly BoundedString: unique symbol;
}

export function asBoundedString(str: string) {
  return str as t.Branded<string, BoundedStringBrand>;
}

export function tBoundedString(min: number, max: number) {
  return t.brand(
    t.string,
    (str): str is t.Branded<string, BoundedStringBrand> => (str.length >= min && str.length <= max),
    "BoundedString",
  );
}
