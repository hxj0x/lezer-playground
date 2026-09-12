# Lezer Playground

In-browser [Lezer](https://lezer.codemirror.net/) playground for [CodeMirror 6](https://codemirror.net/): compile a grammar plus External JS, parse a sample, and keep grammar ↔ AST ↔ sample in sync. No Node, no backend.

The UI is React + Tailwind + [react-resizable-panels](https://github.com/bvaughn/react-resizable-panels). After a successful compile, the sample editor highlights with your language. Click source or AST to jump and highlight the matching range.

## Run

```bash
pnpm install
pnpm dev      # local dev server
pnpm build    # emit dist/ for any static host
```

## Deploy

The workflow cannot turn Pages on by itself. Do this once, then re-run **Actions → Deploy**:

1. Repo **Settings → Pages → Source** = **GitHub Actions**
2. If the `github-pages` environment asks for approval, approve it

After that, every push to `main` publishes [https://hxj0x.github.io/lezer-playground/](https://hxj0x.github.io/lezer-playground/).


## Features

- Three resizable panes: `grammar` / `external`, `sample input` (live highlight), `AST`. Layout is stored in `localStorage`.
- Editors are CodeMirror 6:
  - `grammar` uses official [`@lezer/lezer`](https://github.com/lezer-parser/lezer-grammar)
  - `external.js` uses `@codemirror/lang-javascript`
  - `sample input` attaches the language you just compiled
- Click **Compile & Parse** (or `Ctrl/⌘ + Enter`). Auto-compile is on by default: grammar / external changes recompile; sample changes only reparse.
- Content restored from a share link or local storage does **not** compile until you confirm — opening someone else's link will not execute their External JS by itself.
- Source ↔ AST mapping:
  - Click an AST node: select and scroll to the sample range
  - Click sample: highlight and scroll to the innermost AST node
  - Hover also syncs the matching range

## Writing external.js

Official `highlight.js` can be pasted as-is: `import { styleTags, tags as t } from "@lezer/highlight"` is rewritten onto the bundled runtime so it does not clash with the injected `styleTags`.

Official `tokens.js` can also be pasted as-is: `import { indent, Dialect_jsx } from "./parser.terms.js"` (or `./parser.terms` / `*.grammar.terms`) is rewritten onto the terms table produced by compiling the grammar.

Imports are optional. Common Lezer runtime names are already in module scope:

```
ExternalTokenizer, ContextTracker, Stack, InputStream, LRParser
NodeProp, NodeType, NodeSet, Tree, TreeFragment
styleTags, tags, tagHighlighter, highlightTree, Tag
```

Each `@external tokens NAME` / `@external propSource NAME` / `@context NAME` in the grammar must `export` a matching factory. `from "..."` paths are not loaded; any path is fine.

`propSource` may be a zero-arg factory (`export function highlight() { return styleTags({ ... }) }`) or an already-built `NodePropSource` (`export const highlight = styleTags({ ... })`).
