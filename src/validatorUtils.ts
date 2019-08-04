import * as t from "io-ts";
import { pipe } from "fp-ts/lib/pipeable";
import { fold, either } from "fp-ts/lib/Either";
import { noop } from "./utils";
import deepDiff from "deep-diff";
import safeRegex from "safe-regex";

export const TSafeRegexString = new t.Type(
  "TSafeRegexString",
  (s): s is string => typeof s === "string",
  (from, to) =>
    either.chain(t.string.validate(from, to), s => {
      return safeRegex(s) ? t.success(s) : t.failure(from, to, "Unsafe regex");
    }),
  s => s,
);

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
    if (context.length > 0 && !isNaN(context[context.length - 1])) context.splice(-1);

    const value = stringify(err.value);
    return value === undefined
      ? `<${context.join("/")}> is required`
      : `Invalid value supplied to <${context.join("/")}>`;
  });
}, noop);

/**
 * Validates the given value against the given schema while also disallowing extra properties
 * See: https://github.com/gcanti/io-ts/issues/322
 */
export function validateStrict(schema: t.HasProps, value: any): string[] | null {
  const validationResult = t.exact(schema).decode(value);
  return pipe(
    validationResult,
    fold(
      err => report(validationResult),
      result => {
        // Make sure there are no extra properties
        if (JSON.stringify(value) !== JSON.stringify(result)) {
          const diff = deepDiff(result, value);
          const errors = diff.filter(d => d.kind === "N").map(d => `Unknown property <${d.path.join(".")}>`);
          return errors.length ? errors : ["Found unknown properties"];
        }

        return null;
      },
    ),
  );
}
