import * as t from "io-ts";
import { pipe } from "fp-ts/lib/pipeable";
import { fold } from "fp-ts/lib/Either";
import { PathReporter } from "io-ts/lib/PathReporter";

/**
 * Validates the given value against the given schema while also disallowing extra properties
 * See: https://github.com/gcanti/io-ts/issues/322
 */
export function validateStrict(schema: t.Type<any, any, any>, value: any): string[] | null {
  const validationResult = schema.decode(value);
  return pipe(
    validationResult,
    fold(
      err => PathReporter.report(validationResult),
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
