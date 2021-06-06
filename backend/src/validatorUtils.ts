import deepDiff from "deep-diff";
import { either, fold } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import * as t from "io-ts";
import { noop } from "./utils";

const regexWithFlags = /^\/(.*?)\/([i]*)$/;

export class InvalidRegexError extends Error {}

/**
 * This function supports two input syntaxes for regexes: /<pattern>/<flags> and just <pattern>
 */
export function inputPatternToRegExp(pattern: string) {
  const advancedSyntaxMatch = pattern.match(regexWithFlags);
  const [finalPattern, flags] = advancedSyntaxMatch ? [advancedSyntaxMatch[1], advancedSyntaxMatch[2]] : [pattern, ""];
  try {
    return new RegExp(finalPattern, flags);
  } catch (e) {
    throw new InvalidRegexError(e.message);
  }
}

export const TRegex = new t.Type<RegExp, string>(
  "TRegex",
  (s): s is RegExp => s instanceof RegExp,
  (from, to) =>
    either.chain(t.string.validate(from, to), s => {
      try {
        return t.success(inputPatternToRegExp(s));
      } catch (err) {
        if (err instanceof InvalidRegexError) {
          return t.failure(s, [], err.message);
        }

        throw err;
      }
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
  private readonly errors;

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

export function validate(schema: t.Type<any>, value: any): StrictValidationError | null {
  const validationResult = schema.decode(value);
  return (
    pipe(
      validationResult,
      fold(
        err => report(validationResult),
        result => null,
      ),
    ) || null
  );
}

/**
 * Decodes and validates the given value against the given schema while also disallowing extra properties
 * See: https://github.com/gcanti/io-ts/issues/322
 */
export function decodeAndValidateStrict<T extends t.HasProps>(
  schema: T,
  value: any,
  debug = false,
): StrictValidationError | any {
  const validationResult = t.exact(schema).decode(value);
  return pipe(
    validationResult,
    fold(
      err => report(validationResult),
      result => {
        // Make sure there are no extra properties
        if (debug) {
          console.log(
            "JSON.stringify() check:",
            JSON.stringify(value) === JSON.stringify(result)
              ? "they are the same, no excess"
              : "they are not the same, might have excess",
            result,
          );
        }
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
