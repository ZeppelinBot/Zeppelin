import test from "ava";
import * as t from "io-ts";
import { tDeepPartial } from "./utils";
import * as validatorUtils from "./validatorUtils";

test("tDeepPartial works", ava => {
  const originalSchema = t.type({
    listOfThings: t.record(
      t.string,
      t.type({
        enabled: t.boolean,
        someValue: t.number,
      }),
    ),
  });

  const deepPartialSchema = tDeepPartial(originalSchema);

  const partialValidValue = {
    listOfThings: {
      myThing: {
        someValue: 5,
      },
    },
  };

  const partialErrorValue = {
    listOfThings: {
      myThing: {
        someValue: "test",
      },
    },
  };

  const result1 = validatorUtils.validate(deepPartialSchema, partialValidValue);
  ava.is(result1, null);

  const result2 = validatorUtils.validate(deepPartialSchema, partialErrorValue);
  ava.not(result2, null);
});
