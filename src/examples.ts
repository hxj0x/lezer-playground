export interface Example {
  id: string
  label: string
  grammar: string
  tokens: string
  highlight: string
  context: string
  sample: string
}

export function playgroundTitle(exampleId: string, grammar: string): string {
  const ex = examples.find((item) => item.id === exampleId)
  if (ex) return `Lezer Playground · ${ex.label}`
  const top = grammar.match(/@top\s+([A-Za-z_$][\w$]*)/)
  if (top) return `Lezer Playground · ${top[1]}`
  return 'Lezer Playground'
}

export const examples: Example[] = [
  {
    id: 'minimal',
    label: 'Minimal',
    grammar: `// A tiny language with no External JS: assignments + line comments
@top Program { statement* }

statement { Assign ";" }
Assign { Identifier "=" Number }

@skip { space | LineComment }

@tokens {
  Identifier { $[a-zA-Z_]+ }
  Number { $[0-9]+ }
  space { $[ \\t\\n\\r]+ }
  LineComment { "//" ![\\n]* }
  "=" ";"
}
`,
    tokens: '',
    highlight: '',
    context: '',
    sample: `x = 1;
// comment
y = 42;
`,
  },
  {
    id: 'external',
    label: 'External',
    grammar: `// All three External hooks at once:
//   @external tokens    — custom lexer (timestamp literals)
//   @context            — custom context tracker
//   @external propSource — custom highlight mapping
@top Program { statement* }

statement { Assign ";" | Print ";" }

Assign { Identifier "=" Expr }
Print  { "?" Expr }
Expr   { Number | Timestamp | Identifier }

@skip { space | LineComment }

@tokens {
  Identifier { $[a-zA-Z_]+ }
  Number { $[0-9]+ }
  space { $[ \\t\\n\\r]+ }
  LineComment { "//" ![\\n]* }
  "=" ";" "?"
}

// External tokenizer: "@" + digits, e.g. @1699999999
@external tokens timestampToken from "./external.js" { Timestamp }

@external propSource highlight from "./external.js"

@context indentTracker from "./external.js"
`,
    tokens: `// tokens.js
// Same form as official @lezer/* packages: import term IDs from
// "./parser.terms.js" (or "./parser.terms"), then export the tokenizer.
// A factory \`export function timestampToken(terms) { ... terms.Timestamp ... }\`
// still works if you prefer that.

import { Timestamp } from "./parser.terms.js"

export const timestampToken = new ExternalTokenizer((input) => {
  if (input.next != 64 /* '@' */) return;
  let pos = 1;
  while (input.peek(pos) >= 48 && input.peek(pos) <= 57 /* 0-9 */) pos++;
  if (pos > 1) input.acceptToken(Timestamp, pos);
});
`,
    highlight: `// highlight.js
// Export the same NAME used in "@external propSource NAME from ..."
// Zero-arg factory; or export const highlight = styleTags({ ... })

export function highlight() {
  return styleTags({
    Identifier: tags.variableName,
    Number: tags.number,
    Timestamp: tags.special(tags.number),
    LineComment: tags.lineComment,
    "= ;": tags.punctuation,
    "?": tags.keyword,
  });
}
`,
    context: `// context.js
// Export the same NAME used in "@context NAME from ..."

export function indentTracker() {
  return new ContextTracker({
    start: 0,
    shift(depth) {
      return depth;
    },
  });
}
`,
    sample: `x = 42;
// print a timestamp
? @1699999999;
y = x;
`,
  },
  {
    id: 'json',
    label: 'JSON',
    grammar: `// Familiar JSON: objects, arrays, and scalars. No External JS.
@top JsonText { value }

value { Object | Array | String | Number | True | False | Null }

Object { "{" (Property ("," Property)*)? "}" }
Property { String ":" value }
Array { "[" (value ("," value)*)? "]" }

@skip { space }

@tokens {
  space { $[ \\t\\n\\r]+ }
  String { '"' !["\\n]* '"' }
  Number { "-"? @digit+ ("." @digit+)? (("e" | "E") ("+" | "-")? @digit+)? }
  True { "true" }
  False { "false" }
  Null { "null" }
  "{" "}" "[" "]" "," ":"
}
`,
    tokens: '',
    highlight: '',
    context: '',
    sample: `{
  "ok": true,
  "items": [1, 2, 3],
  "name": "lezer"
}
`,
  },
  {
    id: 'precedence',
    label: 'Precedence',
    grammar: `// @precedence resolves shift/reduce conflicts: * binds tighter than +
@top Program { Expr }

@precedence { times @left, plus @left }

Expr {
  Expr !plus ("+" | "-") Expr |
  Expr !times ("*" | "/") Expr |
  Number |
  "(" Expr ")"
}

@skip { space }

@tokens {
  Number { @digit+ }
  space { $[ \\t\\n\\r]+ }
  "(" ")" "+" "-" "*" "/"
}
`,
    tokens: '',
    highlight: '',
    context: '',
    sample: `1 + 2 * 3
(4 + 5) * 6
`,
  },
  {
    id: 'dialects',
    label: 'Dialects',
    grammar: `// HashComment is only a token when the "comments" dialect is on.
// This playground parses without dialects, so # comments are errors.
@dialects { comments }

@top Program { Word+ }

@skip { space | HashComment }

@tokens {
  Word { @asciiLetter+ }
  space { $[ \\t\\n\\r]+ }
  HashComment[@dialect=comments] { "#" ![\\n]* }
}
`,
    tokens: '',
    highlight: '',
    context: '',
    sample: `hello
world
`,
  },
]
