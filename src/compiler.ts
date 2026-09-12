import { buildParser } from '@lezer/generator'
import type { NodePropSource, SyntaxNode } from '@lezer/common'
import { parser as jsParser } from '@lezer/javascript'
import { ContextTracker, ExternalTokenizer, type LRParser, type Stack } from '@lezer/lr'
import * as lr from '@lezer/lr'
import * as common from '@lezer/common'
import * as highlight from '@lezer/highlight'

// Expose a single bundled copy of the Lezer runtime so external.js can use
// `new ExternalTokenizer(...)` without imports, and so those classes are the
// exact same ones the parser runtime uses.
type RuntimeNS = 'lr' | 'common' | 'highlight' | 'terms'
type TermTable = { [name: string]: number }

;(globalThis as unknown as { __lezerRuntime: Record<Exclude<RuntimeNS, 'terms'>, unknown> }).__lezerRuntime = {
  lr,
  common,
  highlight,
}

const PRELUDE_GROUPS: { ns: Exclude<RuntimeNS, 'terms'>; names: string[] }[] = [
  {
    ns: 'lr',
    names: ['ExternalTokenizer', 'ContextTracker', 'Stack', 'InputStream', 'LRParser'],
  },
  {
    ns: 'common',
    names: ['NodeProp', 'NodeType', 'NodeSet', 'Tree', 'TreeFragment'],
  },
  {
    ns: 'highlight',
    names: ['styleTags', 'tags', 'tagHighlighter', 'highlightTree', 'Tag'],
  },
]

const PACKAGE_NS: Record<string, Exclude<RuntimeNS, 'terms'>> = {
  '@lezer/lr': 'lr',
  '@lezer/common': 'common',
  '@lezer/highlight': 'highlight',
}

const STUB_TOKENIZER = new ExternalTokenizer(() => {})
const STUB_CONTEXT = new ContextTracker({ start: 0 })
const STUB_SPECIALIZER = () => -1

function isParserTermsSpecifier(spec: string): boolean {
  return /(?:^|\/)parser\.terms(?:\.js)?$/.test(spec) || /\.grammar\.terms(?:\.js)?$/.test(spec)
}

function namespaceOf(specifier: string | null): RuntimeNS | null {
  if (!specifier) return null
  if (specifier in PACKAGE_NS) return PACKAGE_NS[specifier]
  return isParserTermsSpecifier(specifier) ? 'terms' : null
}

function findDialects(grammarText: string): string[] {
  const block = grammarText.match(/@dialects\s*\{([^}]*)\}/)
  return block ? block[1].split(/[\s,]+/).filter(Boolean) : []
}

function publishTerms(termTable: TermTable, dialects: string[]): TermTable {
  const terms: TermTable = Object.create(null)
  for (const name of Object.keys(termTable)) {
    if (/^[\w$]+$/.test(name)) terms[name] = termTable[name]
  }
  dialects.forEach((name, id) => {
    terms[`Dialect_${name}`] = id
  })
  return terms
}

let cachedTermsGrammar = ''
let cachedTerms: TermTable | null = null

function termsForGrammar(grammarText: string): TermTable {
  if (cachedTerms && cachedTermsGrammar === grammarText) return cachedTerms
  // Official tokens.js reads term IDs at module init (python builds a Set/Map
  // of node ids before any tokenizer runs), so the table must exist first.
  // buildParser attaches the same termTable the generator writes to parser.terms.js.
  const parser = buildParser(grammarText, {
    warn: () => {},
    externalTokenizer: () => STUB_TOKENIZER,
    externalSpecializer: () => STUB_SPECIALIZER,
    contextTracker: STUB_CONTEXT,
  }) as LRParser & { termTable: TermTable }
  const terms = publishTerms(parser.termTable, findDialects(grammarText))
  cachedTermsGrammar = grammarText
  cachedTerms = terms
  return terms
}

function termsLiteral(terms: TermTable): string {
  return `{ ${Object.keys(terms).map((name) => `${name}: ${terms[name]}`).join(', ')} }`
}

function sourceImportsParserTerms(source: string): boolean {
  let found = false
  jsParser.parse(source).iterate({
    enter(node) {
      if (found || node.name !== 'ImportDeclaration') return
      const spec = specifierOf(source, node.node)
      if (spec && isParserTermsSpecifier(spec)) found = true
    },
  })
  return found
}

export class ExternalCompileError extends Error {
  line?: number
  ch?: number
  constructor(message: string, loc?: { line: number; ch: number }) {
    super(message)
    this.name = 'ExternalCompileError'
    if (loc) {
      this.line = loc.line
      this.ch = loc.ch
    }
  }
}

export interface CompileSuccess {
  ok: true
  parser: LRParser
  warnings: string[]
}
export interface CompileFailure {
  ok: false
  error: string
  source: 'grammar' | 'external'
  line?: number
  ch?: number
}
export type CompileResult = CompileSuccess | CompileFailure

export const PRELUDE_NAMES = PRELUDE_GROUPS.flatMap((group) => group.names)

function buildPrelude(bound: Set<string>): string {
  const lines: string[] = []
  for (const group of PRELUDE_GROUPS) {
    const names = group.names.filter((name) => !bound.has(name))
    if (names.length === 0) continue
    lines.push(`const { ${names.join(', ')} } = globalThis.__lezerRuntime.${group.ns};`)
  }
  return lines.join('\n')
}

function unquote(raw: string): string {
  return raw.slice(1, -1)
}

function specifierOf(source: string, node: SyntaxNode): string | null {
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.name === 'String') return unquote(source.slice(child.from, child.to))
  }
  return null
}

function collectNamedImports(source: string, group: SyntaxNode): { imported: string; local: string }[] {
  const named: { imported: string; local: string }[] = []
  let imported: string | null = null
  let skipType = false
  let awaitingAs = false
  for (let child = group.firstChild; child; child = child.nextSibling) {
    if (child.name === 'type') {
      skipType = true
      continue
    }
    if (child.name === 'as') {
      awaitingAs = true
      continue
    }
    if (child.name === 'VariableName' || child.name === 'String') {
      imported = child.name === 'String' ? unquote(source.slice(child.from, child.to)) : source.slice(child.from, child.to)
      continue
    }
    if (child.name !== 'VariableDefinition') continue
    const local = source.slice(child.from, child.to)
    if (skipType) {
      skipType = false
      imported = null
      awaitingAs = false
      continue
    }
    named.push({ imported: awaitingAs && imported ? imported : local, local })
    imported = null
    awaitingAs = false
    skipType = false
  }
  return named
}

function rewriteImportNode(
  source: string,
  node: SyntaxNode,
  bound: Set<string>,
  terms: TermTable | null,
): string | null {
  const specifier = specifierOf(source, node)
  const ns = namespaceOf(specifier)
  if (!ns) return null
  let isTypeOnly = false
  let starLocal: string | null = null
  let sawStar = false
  let hasDefault = false
  let hasGroup = false
  const named: { imported: string; local: string }[] = []

  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.name === 'type') isTypeOnly = true
    else if (child.name === 'Star') sawStar = true
    else if (child.name === 'ImportGroup') {
      hasGroup = true
      named.push(...collectNamedImports(source, child))
    } else if (child.name === 'VariableDefinition') {
      const name = source.slice(child.from, child.to)
      if (sawStar && !starLocal) starLocal = name
      else if (!hasGroup) hasDefault = true
    }
  }

  if (isTypeOnly) return ''
  if (hasDefault) return null
  if (ns === 'terms') {
    if (!terms) {
      throw new ExternalCompileError(
        `External JS imports "${specifier}", but the grammar has not produced a terms table.`,
      )
    }
    const missing = named.filter((item) => !(item.imported in terms))
    if (missing.length) {
      throw new ExternalCompileError(
        `"${specifier}" has no export named ${missing.map((item) => `"${item.imported}"`).join(', ')}.`,
      )
    }
    const table = termsLiteral(terms)
    if (starLocal) {
      bound.add(starLocal)
      return `const ${starLocal} = ${table};`
    }
    if (named.length === 0) return ''
    const bindings = named.map((item) => {
      bound.add(item.local)
      return item.imported === item.local ? item.local : `${item.imported}: ${item.local}`
    })
    return `const { ${bindings.join(', ')} } = ${table};`
  }
  if (starLocal) {
    bound.add(starLocal)
    return `const ${starLocal} = globalThis.__lezerRuntime.${ns};`
  }
  if (named.length === 0) return null
  const bindings = named.map((item) => {
    bound.add(item.local)
    return item.imported === item.local ? item.local : `${item.imported}: ${item.local}`
  })
  return `const { ${bindings.join(', ')} } = globalThis.__lezerRuntime.${ns};`
}

function rewriteLezerImports(
  source: string,
  terms: TermTable | null,
): { code: string; bound: Set<string> } {
  const bound = new Set<string>()
  const replacements: { from: number; to: number; text: string }[] = []
  jsParser.parse(source).iterate({
    enter(node) {
      if (node.name !== 'ImportDeclaration') return
      const text = rewriteImportNode(source, node.node, bound, terms)
      if (text == null) return
      replacements.push({ from: node.from, to: node.to, text })
      return false
    },
  })
  if (replacements.length === 0) return { code: source, bound }
  replacements.sort((a, b) => b.from - a.from)
  let code = source
  for (const item of replacements) code = code.slice(0, item.from) + item.text + code.slice(item.to)
  return { code, bound }
}

function assertNoUnresolvedImports(code: string) {
  jsParser.parse(code).iterate({
    enter(node) {
      if (node.name !== 'ImportDeclaration' && node.name !== 'ExportDeclaration') return
      const spec = specifierOf(code, node.node)
      if (!spec) return
      if (spec.startsWith('@lezer/')) {
        throw new ExternalCompileError(
          `External JS still has a Lezer import that cannot be rewritten: ${spec}.\n` +
            `Supported forms: \`import { ... } from "@lezer/lr|common|highlight"\` and \`import * as ns from "..."\` (official highlight.js can be pasted as-is).`,
        )
      }
      if (spec.startsWith('./') || spec.startsWith('../')) {
        throw new ExternalCompileError(
          `External JS still has an import the browser cannot resolve: "${spec}".\n` +
            `@lezer/highlight, @lezer/lr, @lezer/common, and ./parser.terms.js are wired to the playground runtime.\n` +
            `Other relative files are not loaded.`,
        )
      }
    },
  })
}

/** Loads the user's external.js source as a real browser ES module via a Blob URL. */
async function loadExternalModule(
  source: string,
  terms: TermTable | null,
): Promise<Record<string, unknown>> {
  const trimmed = source.trim()
  if (!trimmed) return {}
  const { code, bound } = rewriteLezerImports(trimmed, terms)
  assertNoUnresolvedImports(code)
  const prelude = buildPrelude(bound)
  const full = (prelude ? prelude + '\n' : '') + code
  const blob = new Blob([full], { type: 'text/javascript' })
  const url = URL.createObjectURL(blob)
  const preludeShift = prelude ? prelude.split('\n').length : 0
  try {
    return await import(/* @vite-ignore */ url)
  } catch (e: unknown) {
    const loc = parseJsErrorLoc(e)
    const shifted =
      loc && loc.line - preludeShift >= 1
        ? { line: loc.line - preludeShift, ch: loc.ch }
        : undefined
    throw new ExternalCompileError(e instanceof Error ? e.message : String(e), shifted)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function parseJsErrorLoc(e: unknown): { line: number; ch: number } | null {
  if (typeof e === 'object' && e && 'lineNumber' in e) {
    const line = (e as { lineNumber: unknown }).lineNumber
    if (typeof line === 'number') {
      const columnNumber = (e as { columnNumber?: unknown }).columnNumber
      return { line, ch: typeof columnNumber === 'number' ? columnNumber - 1 : 0 }
    }
  }
  const stack = e instanceof Error ? e.stack ?? '' : ''
  const blob = stack.match(/blob:[^\s)]*:(\d+):(\d+)/)
  if (blob) return { line: Number(blob[1]), ch: Number(blob[2]) - 1 }
  const match = stack.match(/:(\d+):(\d+)\s*\)?/)
  if (!match) return null
  return { line: Number(match[1]), ch: Number(match[2]) - 1 }
}

function missingExport(name: string, kind: string, mod: Record<string, unknown>): never {
  const available = Object.keys(mod).filter((key) => key !== 'default')
  const factoryArgs = kind === 'propSource' ? '' : 'terms'
  throw new ExternalCompileError(
    `External JS has no export named "${name}" (used by @external ${kind} in the grammar).\n` +
      `Add: export function ${name}(${factoryArgs}) { ... }\n` +
      `Or, like official highlight.js: export const ${name} = styleTags({ ... })\n` +
      `propSource factories must be zero-arg (\`function ${name}()\` / \`function ${name}(terms = undefined)\`). A function with required parameters is treated as an already-built NodePropSource.\n` +
      (available.length ? `Current exports: ${available.join(', ')}` : `External JS has no exports.`),
  )
}

function resolveExport(
  mod: Record<string, unknown>,
  name: string,
  arg: unknown,
  kind: string,
): unknown {
  const value = mod[name]
  if (value === undefined) missingExport(name, kind, mod)
  if (typeof value !== 'function') return value
  // Official highlight.js exports `const foo = styleTags({...})`, already a
  // NodePropSource (arity > 0). Playground factories are zero-arg.
  // `function f(a = 1)` has length 0 and is called; `function f(terms)` has
  // length 1 and is treated as a finished NodePropSource.
  if (kind === 'propSource' && value.length > 0) return value
  return (value as (a: unknown) => unknown)(arg)
}

function resolveTokenizer(
  mod: Record<string, unknown>,
  name: string,
  terms: { [name: string]: number },
): ExternalTokenizer {
  const value = resolveExport(mod, name, terms, 'tokens')
  if (!(value instanceof ExternalTokenizer)) {
    throw new ExternalCompileError(`"${name}" must export an ExternalTokenizer (or a factory that returns one).`)
  }
  return value
}

function resolvePropSource(mod: Record<string, unknown>, name: string): NodePropSource {
  const value = resolveExport(mod, name, undefined, 'propSource')
  if (typeof value !== 'function') {
    throw new ExternalCompileError(`"${name}" must export a NodePropSource (styleTags result or a zero-arg factory).`)
  }
  return value as NodePropSource
}

function resolveSpecializer(
  mod: Record<string, unknown>,
  name: string,
  terms: { [name: string]: number },
): (value: string, stack: Stack) => number {
  const value = resolveExport(mod, name, terms, 'specialize')
  if (typeof value !== 'function') {
    throw new ExternalCompileError(`"${name}" must export a specializer function (or a factory that returns one).`)
  }
  return value as (value: string, stack: Stack) => number
}

function resolveContext(
  mod: Record<string, unknown>,
  name: string,
  terms: { [name: string]: number },
): ContextTracker<unknown> {
  const value = resolveExport(mod, name, terms, 'context')
  if (!(value instanceof ContextTracker)) {
    throw new ExternalCompileError(`"${name}" must export a ContextTracker (or a factory that returns one).`)
  }
  return value
}

function findContextName(grammarText: string): string | null {
  const m = grammarText.match(/@context\s+([A-Za-z_$][\w$]*)\s+from/)
  return m ? m[1] : null
}

export async function compileGrammar(
  grammarText: string,
  externalSource: string,
): Promise<CompileResult> {
  try {
    const trimmed = externalSource.trim()
    const termTable = trimmed && sourceImportsParserTerms(trimmed) ? termsForGrammar(grammarText) : null
    const mod = await loadExternalModule(externalSource, termTable)
    const contextName = findContextName(grammarText)
    const warnings: string[] = []

    const parser = buildParser(grammarText, {
      warn: (msg: string) => warnings.push(msg),
      externalTokenizer: (name, terms) => resolveTokenizer(mod, name, terms),
      externalPropSource: (name) => resolvePropSource(mod, name),
      externalSpecializer: (name, terms) => resolveSpecializer(mod, name, terms),
      contextTracker: contextName ? (terms) => resolveContext(mod, contextName, terms) : undefined,
    })

    return { ok: true, parser, warnings }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    if (e instanceof ExternalCompileError) {
      return { ok: false, error: message, source: 'external', line: e.line, ch: e.ch }
    }
    return { ok: false, error: message, source: 'grammar' }
  }
}
