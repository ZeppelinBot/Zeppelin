import test from "ava";
import { parseTemplate, renderParsedTemplate, renderTemplate } from "./templateFormatter";

test("Parses plain string templates correctly", t => {
  const result = parseTemplate("foo bar baz");
  t.deepEqual(result, ["foo bar baz"]);
});

test("Parses templates with variables correctly", t => {
  const result = parseTemplate("foo {bar} baz");
  t.deepEqual<any>(result, [
    "foo ",
    {
      identifier: "bar",
      args: [],
    },
    " baz",
  ]);
});

test("Parses templates with function variables correctly", t => {
  const result = parseTemplate('foo {bar("str", 5.07)} baz');
  t.deepEqual<any>(result, [
    "foo ",
    {
      identifier: "bar",
      args: ["str", 5.07],
    },
    " baz",
  ]);
});

test("Parses function variables with variable arguments correctly", t => {
  const result = parseTemplate('foo {bar("str", 5.07, someVar)} baz');
  t.deepEqual<any>(result, [
    "foo ",
    {
      identifier: "bar",
      args: [
        "str",
        5.07,
        {
          identifier: "someVar",
          args: [],
        },
      ],
    },
    " baz",
  ]);
});

test("Parses function variables with function variable arguments correctly", t => {
  const result = parseTemplate('foo {bar("str", 5.07, deeply(nested(8)))} baz');
  t.deepEqual<any>(result, [
    "foo ",
    {
      identifier: "bar",
      args: [
        "str",
        5.07,
        {
          identifier: "deeply",
          args: [
            {
              identifier: "nested",
              args: [8],
            },
          ],
        },
      ],
    },
    " baz",
  ]);
});

test("Renders a parsed template correctly", async t => {
  const parseResult = parseTemplate('foo {bar("str", 5.07, deeply(nested(8)))} baz');
  const values = {
    bar(strArg, numArg, varArg) {
      return `${strArg} ${numArg} !${varArg}!`;
    },
    deeply(varArg) {
      return `<${varArg}>`;
    },
    nested(numArg) {
      return `?${numArg}?`;
    },
  };

  const renderResult = await renderParsedTemplate(parseResult, values);
  t.is(renderResult, "foo str 5.07 !<?8?>! baz");
});

test("Supports base values in renderTemplate", async t => {
  const result = await renderTemplate('{if("", "+", "-")} {if(1, "+", "-")}');
  t.is(result, "- +");
});

test("Edge case #1", async t => {
  const result = await renderTemplate("{foo} {bar()}");
  // No "Unclosed function" exception = success
  t.pass();
});

test("Parses empty string args as empty strings", async t => {
  const result = parseTemplate('{foo("")}');
  t.deepEqual<any>(result, [
    {
      identifier: "foo",
      args: [""],
    },
  ]);
});
