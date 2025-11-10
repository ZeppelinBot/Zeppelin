/*
   Modified version of https://gist.github.com/jaens/7e15ae1984bb338c86eb5e452dee3010
   Original version's license:

   Copyright 2024, Jaen - https://github.com/jaens

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

import { z } from "zod";
import { $ZodRecordKey, $ZodType } from "zod/v4/core";

const RESOLVING = Symbol("mapOnSchema/resolving");

export function mapOnSchema<T extends $ZodType, TResult extends $ZodType>(
  schema: T,
  fn: (schema: $ZodType) => TResult,
): TResult;

/**
 * Applies {@link fn} to each element of the schema recursively, replacing every schema with its return value.
 * The rewriting is applied bottom-up (ie. {@link fn} will get called on "children" first).
 */
export function mapOnSchema(schema: $ZodType, fn: (schema: $ZodType) => $ZodType): $ZodType {
  // Cache results to support recursive schemas
  const results = new Map<$ZodType, $ZodType | typeof RESOLVING>();

  function mapElement(s: $ZodType) {
    const value = results.get(s);
    if (value === RESOLVING) {
      throw new Error("Recursive schema access detected");
    } else if (value !== undefined) {
      return value;
    }

    results.set(s, RESOLVING);
    const result = mapOnSchema(s, fn);
    results.set(s, result);
    return result;
  }

  function mapInner() {
    if (schema instanceof z.ZodObject) {
      const newShape: Record<string, $ZodType> = {};
      for (const [key, value] of Object.entries(schema.shape)) {
        newShape[key] = mapElement(value);
      }

      return new z.ZodObject({
        ...schema.def,
        shape: newShape,
      });
    } else if (schema instanceof z.ZodArray) {
      return new z.ZodArray({
        ...schema.def,
        type: "array",
        element: mapElement(schema.def.element),
      });
    } else if (schema instanceof z.ZodMap) {
      return new z.ZodMap({
        ...schema.def,
        keyType: mapElement(schema.def.keyType),
        valueType: mapElement(schema.def.valueType),
      });
    } else if (schema instanceof z.ZodSet) {
      return new z.ZodSet({
        ...schema.def,
        valueType: mapElement(schema.def.valueType),
      });
    } else if (schema instanceof z.ZodOptional) {
      return new z.ZodOptional({
        ...schema.def,
        innerType: mapElement(schema.def.innerType),
      });
    } else if (schema instanceof z.ZodNullable) {
      return new z.ZodNullable({
        ...schema.def,
        innerType: mapElement(schema.def.innerType),
      });
    } else if (schema instanceof z.ZodDefault) {
      return new z.ZodDefault({
        ...schema.def,
        innerType: mapElement(schema.def.innerType),
      });
    } else if (schema instanceof z.ZodReadonly) {
      return new z.ZodReadonly({
        ...schema.def,
        innerType: mapElement(schema.def.innerType),
      });
    } else if (schema instanceof z.ZodLazy) {
      return new z.ZodLazy({
        ...schema.def,
        // NB: This leaks `fn` into the schema, but there is no other way to support recursive schemas
        getter: () => mapElement(schema._def.getter()),
      });
    } else if (schema instanceof z.ZodPromise) {
      return new z.ZodPromise({
        ...schema.def,
        innerType: mapElement(schema.def.innerType),
      });
    } else if (schema instanceof z.ZodCatch) {
      return new z.ZodCatch({
        ...schema.def,
        innerType: mapElement(schema._def.innerType),
      });
    } else if (schema instanceof z.ZodTuple) {
      return new z.ZodTuple({
        ...schema.def,
        items: schema.def.items.map((item: $ZodType) => mapElement(item)),
        rest: schema.def.rest && mapElement(schema.def.rest),
      });
    } else if (schema instanceof z.ZodDiscriminatedUnion) {
      return new z.ZodDiscriminatedUnion({
        ...schema.def,
        options: schema.options.map((option) => mapOnSchema(option, fn)),
      });
    } else if (schema instanceof z.ZodUnion) {
      return new z.ZodUnion({
        ...schema.def,
        options: schema.options.map((option) => mapOnSchema(option, fn)),
      });
    } else if (schema instanceof z.ZodIntersection) {
      return new z.ZodIntersection({
        ...schema.def,
        right: mapElement(schema.def.right),
        left: mapElement(schema.def.left),
      });
    } else if (schema instanceof z.ZodRecord) {
      return new z.ZodRecord({
        ...schema.def,
        keyType: mapElement(schema.def.keyType) as $ZodRecordKey,
        valueType: mapElement(schema.def.valueType),
      });
    } else {
      return schema;
    }
  }

  return fn(mapInner());
}

export function deepPartial<T extends z.ZodType>(schema: T): T {
  return mapOnSchema(schema, (s) => (s instanceof z.ZodObject ? s.partial() : s)) as T;
}

/** Make all object schemas "strict" (ie. fail on unknown keys), except if they are marked as `.passthrough()` */
export function deepStrict<T extends z.ZodType>(schema: T): T {
  return mapOnSchema(schema, (s) =>
    s instanceof z.ZodObject /* && s.def.unknownKeys !== "passthrough" */ ? s.strict() : s,
  ) as T;
}

export function deepStrictAll<T extends z.ZodType>(schema: T): T {
  return mapOnSchema(schema, (s) => (s instanceof z.ZodObject ? s.strict() : s)) as T;
}
