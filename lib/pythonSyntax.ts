export type PythonTokenKind =
  | "plain"
  | "keyword"
  | "builtin"
  | "constant"
  | "number"
  | "string"
  | "comment"
  | "operator"
  | "declaration"
  | "decorator";

export type PythonToken = {
  content: string;
  kind: PythonTokenKind;
};

const KEYWORDS = new Set([
  "and", "as", "assert", "async", "await", "break", "case", "class",
  "continue", "def", "del", "elif", "else", "except", "finally", "for",
  "from", "global", "if", "import", "in", "is", "lambda", "match",
  "nonlocal", "not", "or", "pass", "raise", "return", "try", "type",
  "while", "with", "yield",
]);

const CONSTANTS = new Set(["False", "None", "True", "Ellipsis", "NotImplemented"]);

const BUILTINS = new Set([
  "abs", "all", "any", "ascii", "bin", "bool", "breakpoint", "bytearray",
  "bytes", "callable", "chr", "classmethod", "compile", "complex", "delattr",
  "dict", "dir", "divmod", "enumerate", "eval", "exec", "filter", "float",
  "format", "frozenset", "getattr", "globals", "hasattr", "hash", "help",
  "hex", "id", "input", "int", "isinstance", "issubclass", "iter", "len",
  "list", "locals", "map", "max", "memoryview", "min", "next", "object",
  "oct", "open", "ord", "pow", "print", "property", "range", "repr",
  "reversed", "round", "set", "setattr", "slice", "sorted", "staticmethod",
  "str", "sum", "super", "tuple", "type", "vars", "zip", "__import__",
]);

const NUMBER = /^(?:0[bB][01](?:_?[01])*|0[oO][0-7](?:_?[0-7])*|0[xX][\da-fA-F](?:_?[\da-fA-F])*|(?:\d(?:_?\d)*)?(?:\.\d(?:_?\d)*)?(?:[eE][+-]?\d(?:_?\d)*)?[jJ]?)/;
const IDENTIFIER = /^[A-Za-z_][A-Za-z\d_]*/;
const OPERATORS = ["**=", "//=", "<<=", ">>=", ":=", "==", "!=", "<=", ">=", "**", "//", "<<", ">>", "->", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "@=", "+", "-", "*", "/", "%", "@", "&", "|", "^", "~", "<", ">", "="];

function pushToken(tokens: PythonToken[], content: string, kind: PythonTokenKind) {
  if (!content) return;
  const previous = tokens.at(-1);

  if (previous?.kind === kind) {
    previous.content += content;
  } else {
    tokens.push({ content, kind });
  }
}

function readString(source: string, start: number) {
  const opening = source.slice(start).match(/^(?:[rRuUbBfF]{0,2})(?:'''|"""|'|")/);
  if (!opening) return null;

  const marker = opening[0].endsWith("'''")
    ? "'''"
    : opening[0].endsWith('"""')
      ? '"""'
      : opening[0].at(-1)!;
  let index = start + opening[0].length;

  while (index < source.length) {
    if (source[index] === "\\") {
      index += 2;
      continue;
    }
    if (source.startsWith(marker, index)) {
      index += marker.length;
      break;
    }
    index += 1;
  }

  return { content: source.slice(start, index), end: index };
}

export function highlightPython313(source: string) {
  const tokens: PythonToken[] = [];
  let index = 0;
  let declarationExpected = false;
  let decoratorExpected = false;

  while (index < source.length) {
    const rest = source.slice(index);
    const whitespace = rest.match(/^\s+/)?.[0];
    if (whitespace) {
      pushToken(tokens, whitespace, "plain");
      if (whitespace.includes("\n")) decoratorExpected = false;
      index += whitespace.length;
      continue;
    }

    if (source[index] === "#") {
      const comment = rest.match(/^#[^\n]*/)?.[0] ?? "#";
      pushToken(tokens, comment, "comment");
      index += comment.length;
      continue;
    }

    const string = readString(source, index);
    if (string) {
      pushToken(tokens, string.content, "string");
      index = string.end;
      declarationExpected = false;
      continue;
    }

    const number = rest.match(NUMBER)?.[0];
    if (number && /\d/.test(number)) {
      pushToken(tokens, number, "number");
      index += number.length;
      declarationExpected = false;
      continue;
    }

    const identifier = rest.match(IDENTIFIER)?.[0];
    if (identifier) {
      let kind: PythonTokenKind = "plain";
      if (declarationExpected) kind = "declaration";
      else if (decoratorExpected) kind = "decorator";
      else if (KEYWORDS.has(identifier)) kind = "keyword";
      else if (CONSTANTS.has(identifier)) kind = "constant";
      else if (BUILTINS.has(identifier)) kind = "builtin";

      pushToken(tokens, identifier, kind);
      declarationExpected = identifier === "def" || identifier === "class";
      decoratorExpected = false;
      index += identifier.length;
      continue;
    }

    const operator = OPERATORS.find((value) => source.startsWith(value, index));
    if (operator) {
      pushToken(tokens, operator, "operator");
      decoratorExpected = operator === "@";
      index += operator.length;
      continue;
    }

    pushToken(tokens, source[index], "plain");
    declarationExpected = false;
    index += 1;
  }

  return tokens;
}
