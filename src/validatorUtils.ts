import * as t from "io-ts";
import { pipe } from "fp-ts/lib/pipeable";
import { fold, either } from "fp-ts/lib/Either";
import { noop } from "./utils";
import deepDiff from "deep-diff";
import safeRegex from "safe-regex";

const regexWithFlags = /^\/(.*?)\/([i]*)$/;

/**
 * The TSafeRegex type supports two syntaxes for regexes: /<regex>/<flags> and just <regex>
 * The value is then checked for "catastrophic exponential-time regular expressions" by
 * https://www.npmjs.com/package/safe-regex
 */
export const TSafeRegex = new t.Type<RegExp, string>(
  "TSafeRegex",
  (s): s is RegExp => s instanceof RegExp,
  (from, to) =>
    either.chain(t.string.validate(from, to), s => {
      const advancedSyntaxMatch = s.match(regexWithFlags);
      const [regexStr, flags] = advancedSyntaxMatch ? [advancedSyntaxMatch[1], advancedSyntaxMatch[2]] : [s, ""];
      return safeRegex(regexStr) ? t.success(new RegExp(regexStr, flags)) : t.failure(from, to, "Unsafe regex");
    }),
  s => `/${s.source}/${s.flags}`,
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

export class StrictValidationError extends Error {
  private errors;

  constructor(errors: string[]) {
    errors = Array.from(new Set(errors));
    super(errors.join("\n"));
    this.errors = errors;
  }
  getErrors() {
    return this.errors;
  }
}

const report = fold((errors: any): StrictValidationError | void => {
  const errorStrings = errors.map(err => {
    const context = err.context.map(c => c.key).filter(k => k && !k.startsWith("{"));
    while (context.length > 0 && !isNaN(context[context.length - 1])) context.splice(-1);

    const value = stringify(err.value);
    return value === undefined
      ? `<${context.join("/")}> is required`
      : `Invalid value supplied to <${context.join("/")}>${err.message ? `: ${err.message}` : ""}`;
  });

  return new StrictValidationError(errorStrings);
}, noop);

/**
 * Decodes and validates the given value against the given schema while also disallowing extra properties
 * See: https://github.com/gcanti/io-ts/issues/322
 */
export function decodeAndValidateStrict(schema: t.HasProps, value: any): StrictValidationError | any {
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
          if (errors.length) return new StrictValidationError(errors);
        }

        return result;
      },
    ),
  );
}
