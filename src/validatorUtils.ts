import * as t from "io-ts";
import { pipe } from "fp-ts/lib/pipeable";
import { fold } from "fp-ts/lib/Either";
import { noop } from "./utils";

// From io-ts/lib/PathReporter
function stringify(v) {
  if (typeof v === "function") {
    return t.getFunctionName(v);
  }
  if (typeof v === "number" && !isFinite(v)) {
    if (isNaN(v)) {
      return "NaN";
    }
    return v > 0 ? "Infinity" : "-Infinity";
  }
  return JSON.stringify(v);
}

// From io-ts/lib/PathReporter
// tslint:disable
function getContextPath(context) {
  return context
    .map(function(_a) {
      var key = _a.key,
        type = _a.type;
      return key + ": " + type.name;
    })
    .join("/");
}
// tslint:enable

const report = fold((errors: any) => {
  return errors.map(err => {
    if (err.message) return err.message;
    const context = err.context.map(c => c.key).filter(k => k && !k.startsWith("{"));
    return `Invalid value <${stringify(err.value)}> supplied to <${context.join("/")}>`;
  });
}, noop);

/**
 * Validates the given value against the given schema while also disallowing extra properties
 * See: https://github.com/gcanti/io-ts/issues/322
 */
export function validateStrict(schema: t.Type<any, any, any>, value: any): string[] | null {
  const validationResult = schema.decode(value);
  return pipe(
    validationResult,
    fold(
      err => report(validationResult),
      result => {
        // Make sure there are no extra properties
        if (JSON.stringify(value) !== JSON.stringify(result)) {
          // TODO: Actually mention what the unknown property is
          return ["Found unknown properties"];
        }

        return null;
      },
    ),
  );
}
