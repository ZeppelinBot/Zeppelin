import { parseTemplate, renderParsedTemplate, renderTemplate } from "./templateFormatter";

test("Parses plain string templates correctly", () => {
  const result = parseTemplate("foo bar baz");
  expect(result).toEqual(["foo bar baz"]);
});

test("Parses templates with variables correctly", () => {
  const result = parseTemplate("foo {bar} baz");
  expect(result).toEqual([
    "foo ",
    {
      identifier: "bar",
      args: [],
    },
    " baz",
  ]);
});

test("Parses templates with function variables correctly", () => {
  const result = parseTemplate('foo {bar("str", 5.07)} baz');
  expect(result).toEqual([
    "foo ",
    {
      identifier: "bar",
      args: ["str", 5.07],
    },
    " baz",
  ]);
});

test("Parses function variables with variable arguments correctly", () => {
  const result = parseTemplate('foo {bar("str", 5.07, someVar)} baz');
  expect(result).toEqual([
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

test("Parses function variables with function variable arguments correctly", () => {
  const result = parseTemplate('foo {bar("str", 5.07, deeply(nested(8)))} baz');
  expect(result).toEqual([
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

test("Renders a parsed template correctly", async () => {
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
  expect(renderResult).toBe("foo str 5.07 !<?8?>! baz");
});

test("Supports base values in renderTemplate", async () => {
  const result = await renderTemplate('{if("", "+", "-")} {if(1, "+", "-")}');
  expect(result).toBe("- +");
});
