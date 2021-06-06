import seedrandom from "seedrandom";
import { get, has } from "./utils";

const TEMPLATE_CACHE_SIZE = 200;
const templateCache: Map<string, ParsedTemplate> = new Map();

export class TemplateParseError extends Error {}

interface ITemplateVar {
  identifier: string;
  args: Array<string | number | ITemplateVar>;
  _state: {
    currentArg: string | ITemplateVar;
    currentArgType: "string" | "number" | "var" | null;
    inArg: boolean;
    inQuote: boolean;
  };
  _parent: ITemplateVar | null;
}

function newTemplateVar(): ITemplateVar {
  return {
    identifier: "",
    args: [],
    _state: {
      inArg: false,
      currentArg: "",
      currentArgType: null,
      inQuote: false,
    },
    _parent: null,
  };
}

type ParsedTemplate = Array<string | ITemplateVar>;

function cleanUpParseResult(arr) {
  arr.forEach(item => {
    if (typeof item === "object") {
      delete item._state;
      delete item._parent;
      if (item.args && item.args.length) {
        cleanUpParseResult(item.args);
      }
    }
  });
}

export function parseTemplate(str: string): ParsedTemplate {
  const chars = [...str];
  const result: ParsedTemplate = [];

  let inVar = false;
  let currentString = "";
  let currentVar: ITemplateVar | null = null;
  let rootVar: ITemplateVar | null = null;

  let escapeNext = false;

  const dumpArg = () => {
    if (!currentVar) return;

    if (currentVar._state.currentArgType) {
      if (currentVar._state.currentArgType === "number") {
        if (isNaN(currentVar._state.currentArg as any)) {
          throw new TemplateParseError(`Invalid numeric argument: ${currentVar._state.currentArg}`);
        }

        currentVar.args.push(parseFloat(currentVar._state.currentArg as string));
      } else {
        currentVar.args.push(currentVar._state.currentArg);
      }
    }

    currentVar._state.currentArg = "";
    currentVar._state.currentArgType = null;
  };

  const returnToParentVar = () => {
    if (!currentVar) return;
    currentVar = currentVar._parent;
    dumpArg();
  };

  const exitInjectedVar = () => {
    if (rootVar) {
      if (currentVar && currentVar !== rootVar) {
        throw new TemplateParseError(`Unclosed function!`);
      }

      result.push(rootVar);
      rootVar = null;
    }

    inVar = false;
  };

  for (const [i, char] of chars.entries()) {
    if (inVar) {
      if (currentVar) {
        if (currentVar._state.inArg) {
          // We're parsing arguments
          if (currentVar._state.inQuote) {
            // We're in an open quote
            if (escapeNext) {
              currentVar._state.currentArg += char;
              escapeNext = false;
            } else if (char === "\\") {
              escapeNext = true;
            } else if (char === '"') {
              currentVar._state.inQuote = false;
            } else {
              currentVar._state.currentArg += char;
            }
          } else if (char === ")") {
            // Done with arguments
            dumpArg();
            returnToParentVar();
          } else if (char === ",") {
            // Comma -> dump argument, start new argument
            dumpArg();
          } else if (currentVar._state.currentArgType === "number") {
            // We're parsing a number argument
            // The actual validation of whether this is a number is in dumpArg()
            currentVar._state.currentArg += char;
          } else if (/\s/.test(char)) {
            // Whitespace, ignore
            continue;
          } else if (char === '"') {
            // A double quote can start a string argument, but only if we haven't committed to some other type of argument already
            if (currentVar._state.currentArgType !== null) {
              throw new TemplateParseError(`Unexpected char ${char} at ${i}`);
            }

            currentVar._state.currentArgType = "string";
            currentVar._state.inQuote = true;
          } else if (char.match(/(\d|-)/)) {
            // A number can start a string argument, but only if we haven't committed to some other type of argument already
            if (currentVar._state.currentArgType !== null) {
              throw new TemplateParseError(`Unexpected char ${char} at ${i}`);
            }

            currentVar._state.currentArgType = "number";
            currentVar._state.currentArg += char;
          } else if (currentVar._state.currentArgType === null) {
            // Any other character starts a new var argument if we haven't committed to some other type of argument already
            currentVar._state.currentArgType = "var";

            const newVar = newTemplateVar();
            newVar._parent = currentVar;
            newVar.identifier += char;
            currentVar._state.currentArg = newVar;
            currentVar = newVar;
          } else {
            throw new TemplateParseError(`Unexpected char ${char} at ${i}`);
          }
        } else {
          if (char === "(") {
            currentVar._state.inArg = true;
          } else if (char === ",") {
            // We encountered a comma without ever getting into args
            // -> We're a value property, not a function, and we can return to our parent var
            returnToParentVar();
          } else if (char === ")") {
            // We encountered a closing bracket without ever getting into args
            // -> We're a value property, and this closing bracket actually closes out PARENT var
            // -> "Return to parent var" twice
            returnToParentVar();
            returnToParentVar();
          } else if (char === "}") {
            // We encountered a closing curly bracket without ever getting into args
            // -> We're a value property, and the current injected var ends here
            exitInjectedVar();
          } else {
            currentVar.identifier += char;
          }
        }
      } else {
        if (char === "}") {
          exitInjectedVar();
        } else {
          throw new TemplateParseError(`Unexpected char ${char} at ${i}`);
        }
      }
    } else {
      if (escapeNext) {
        currentString += char;
        escapeNext = false;
      } else if (char === "\\") {
        escapeNext = true;
      } else if (char === "{") {
        if (currentString !== "") {
          result.push(currentString);
          currentString = "";
        }

        const newVar = newTemplateVar();
        currentVar = newVar;
        rootVar = newVar;
        inVar = true;
      } else {
        currentString += char;
      }
    }
  }

  if (inVar) {
    throw new TemplateParseError("Unterminated injected variable!");
  }

  if (currentString !== "") {
    result.push(currentString);
  }

  // Clean-up
  cleanUpParseResult(result);

  return result;
}

async function evaluateTemplateVariable(theVar: ITemplateVar, values) {
  const value = has(values, theVar.identifier) ? get(values, theVar.identifier) : undefined;

  if (typeof value === "function") {
    // Don't allow running functions in nested objects
    if (values[theVar.identifier] == null) {
      return "";
    }

    const args: any[] = [];
    for (const arg of theVar.args) {
      if (typeof arg === "object") {
        const argValue = await evaluateTemplateVariable(arg as ITemplateVar, values);
        args.push(argValue);
      } else {
        args.push(arg);
      }
    }

    const result = await value(...args);
    return result == null ? "" : result;
  }

  return value == null ? "" : value;
}

export async function renderParsedTemplate(parsedTemplate: ParsedTemplate, values: any) {
  let result = "";

  for (const part of parsedTemplate) {
    if (typeof part === "object") {
      result += await evaluateTemplateVariable(part, values);
    } else {
      result += part.toString();
    }
  }

  return result;
}

const baseValues = {
  if(clause, andThen, andElse) {
    return clause ? andThen : andElse;
  },
  and(...args) {
    for (const arg of args) {
      if (!arg) return false;
    }
    return true;
  },
  or(...args) {
    for (const arg of args) {
      if (arg) return true;
    }
    return false;
  },
  not(arg) {
    return !arg;
  },
  concat(...args) {
    return [...args].join("");
  },
  concatArr(arr, separator = "") {
    return arr.join(separator);
  },
  eq(...args) {
    if (args.length < 2) return true;
    for (let i = 1; i < args.length; i++) {
      if (args[i] !== args[i - 1]) return false;
    }
    return true;
  },
  gt(arg1, arg2) {
    return arg1 > arg2;
  },
  gte(arg1, arg2) {
    return arg1 >= arg2;
  },
  lt(arg1, arg2) {
    return arg1 < arg2;
  },
  lte(arg1, arg2) {
    return arg1 <= arg2;
  },
  slice(arg1, start, end) {
    if (typeof arg1 !== "string") return "";
    if (isNaN(start)) return "";
    if (end != null && isNaN(end)) return "";
    return arg1.slice(parseInt(start, 10), end && parseInt(end, 10));
  },
  lower(arg) {
    if (typeof arg !== "string") return arg;
    return arg.toLowerCase();
  },
  upper(arg) {
    if (typeof arg !== "string") return arg;
    return arg.toUpperCase();
  },
  upperFirst(arg) {
    if (typeof arg !== "string") return arg;
    return arg.charAt(0).toUpperCase() + arg.slice(1);
  },
  ucfirst(arg) {
    return baseValues.upperFirst(arg);
  },
  rand(from, to, seed = null) {
    if (isNaN(from)) return 0;

    if (to == null) {
      to = from;
      from = 1;
    }

    if (isNaN(to)) return 0;

    if (to > from) {
      [from, to] = [to, from];
    }

    const randValue = seed != null ? new seedrandom(seed)() : Math.random();

    return Math.round(randValue * (to - from) + from);
  },
  add(...args) {
    return args.reduce((result, arg) => {
      if (isNaN(arg)) return result;
      return result + parseFloat(arg);
    }, 0);
  },
  sub(...args) {
    if (args.length === 0) return 0;
    return args.slice(1).reduce((result, arg) => {
      if (isNaN(arg)) return result;
      return result - parseFloat(arg);
    }, args[0]);
  },
  mul(...args) {
    if (args.length === 0) return 0;
    return args.slice(1).reduce((result, arg) => {
      if (isNaN(arg)) return result;
      return result * parseFloat(arg);
    }, args[0]);
  },
  div(...args) {
    if (args.length === 0) return 0;
    return args.slice(1).reduce((result, arg) => {
      if (isNaN(arg) || parseFloat(arg) === 0) return result;
      return result / parseFloat(arg);
    }, args[0]);
  },
  cases(mod, ...cases) {
    if (cases.length === 0) return "";
    if (isNaN(mod)) return "";
    mod = parseInt(mod, 10) - 1;
    return cases[Math.max(0, mod % cases.length)];
  },
  choose(...cases) {
    const mod = Math.floor(Math.random() * cases.length) + 1;
    return baseValues.cases(mod, ...cases);
  },
};

export async function renderTemplate(template: string, values = {}, includeBaseValues = true) {
  if (includeBaseValues) {
    values = Object.assign({}, baseValues, values);
  }

  let parseResult: ParsedTemplate;
  if (templateCache.has(template)) {
    parseResult = templateCache.get(template)!;
  } else {
    parseResult = parseTemplate(template);

    // If our template cache is full, delete the first item
    if (templateCache.size >= TEMPLATE_CACHE_SIZE) {
      const firstKey = templateCache.keys().next().value;
      templateCache.delete(firstKey);
    }

    templateCache.set(template, parseResult);
  }

  return renderParsedTemplate(parseResult, values);
}
