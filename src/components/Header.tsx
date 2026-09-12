import { useState } from 'react'
import { examples } from '../examples'
import { compile, loadExample, selectMode } from '../playground/actions'
import { useCompileStore } from '../playground/compileStore'
import { shareUrlFor } from '../playground/persist'
import { useSourceStore } from '../playground/sourceStore'
import { referenceLanguages } from '../referenceLanguages'

const REPO = 'https://github.com/hxj0x/lezer-playground'

interface HeaderProps {
  onResetLayout: () => void
}

export function Header({ onResetLayout }: HeaderProps) {
  const mode = useSourceStore((s) => s.mode)
  const exampleId = useSourceStore((s) => s.exampleId)
  const shareBlocked = useSourceStore((s) => s.shareBlocked)
  const compiling = useCompileStore((s) => s.compiling)
  const autoCompile = useCompileStore((s) => s.autoCompile)
  const setAutoCompile = useCompileStore((s) => s.setAutoCompile)
  const statusText = useCompileStore((s) => s.statusText)
  const statusKind = useCompileStore((s) => s.statusKind)
  const [copied, setCopied] = useState(false)
  const custom = mode.kind === 'custom'

  async function copyShareLink() {
    const { mode: currentMode, grammar, tokens, highlight, context, sample, referenceSample } =
      useSourceStore.getState()
    const url = shareUrlFor({
      mode: currentMode,
      grammar,
      tokens,
      highlight,
      context,
      sample,
      referenceSample,
    })
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-line bg-panel-alt px-4 py-2.5">
      <div className="mr-2 min-w-0">
        <h1 className="font-mono text-[15px] font-semibold tracking-tight text-brass">
          Lezer Playground
        </h1>
        <p className="hidden text-[12px] text-muted sm:block">
          In-browser{' '}
          <a
            href="https://lezer.codemirror.net/"
            target="_blank"
            rel="noreferrer"
            className="text-ink underline-offset-2 hover:underline"
          >
            Lezer
          </a>{' '}
          compiler for{' '}
          <a
            href="https://codemirror.net/"
            target="_blank"
            rel="noreferrer"
            className="text-ink underline-offset-2 hover:underline"
          >
            CodeMirror 6
          </a>
          {' — '}
          grammar, AST, and sample stay in sync
        </p>
      </div>

      <select
        value={mode.kind === 'reference' ? mode.languageId : 'custom'}
        onChange={(event) => selectMode(event.target.value)}
        className="rounded-md border border-line bg-panel px-2.5 py-1.5 font-sans text-[13px] text-ink outline-none focus:border-teal"
      >
        <option value="custom">Custom grammar</option>
        {referenceLanguages.map((lang) => (
          <option key={lang.id} value={lang.id}>
            {lang.label} (official)
          </option>
        ))}
      </select>

      {custom ? (
        <select
          value={exampleId || 'custom'}
          onChange={(event) => loadExample(event.target.value)}
          className="rounded-md border border-line bg-panel px-2.5 py-1.5 font-sans text-[13px] text-ink outline-none focus:border-teal"
        >
          {exampleId === '' ? (
            <option value="custom" disabled>
              Custom
            </option>
          ) : null}
          {examples.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.label}
            </option>
          ))}
        </select>
      ) : null}

      {custom ? (
        <label className="flex cursor-pointer items-center gap-2 text-[12px] text-muted">
          <span>Auto-compile</span>
          <button
            type="button"
            role="switch"
            aria-checked={autoCompile}
            onClick={() => setAutoCompile(!autoCompile)}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              autoCompile ? 'bg-teal' : 'bg-line'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                autoCompile ? 'translate-x-4' : ''
              }`}
            />
          </button>
        </label>
      ) : null}

      {custom ? (
        <button
          type="button"
          disabled={compiling}
          onClick={() => void compile()}
          className="rounded-md bg-brass px-3 py-1.5 text-[13px] font-semibold text-on-brass hover:brightness-110 disabled:cursor-default disabled:opacity-50"
        >
          {compiling ? 'Compiling…' : 'Compile & Parse'}
        </button>
      ) : null}

      {custom ? <span className="hidden text-[11px] text-muted md:inline">Ctrl / ⌘ + Enter</span> : null}

      <button
        type="button"
        disabled={shareBlocked}
        title={shareBlocked ? 'Content is too long to share as a URL' : 'Copy share link'}
        onClick={() => void copyShareLink()}
        className="rounded-md border border-line px-2.5 py-1.5 text-[12px] text-muted hover:border-muted hover:text-ink disabled:cursor-default disabled:opacity-50"
      >
        {copied ? 'Copied' : 'Copy share link'}
      </button>

      {shareBlocked ? (
        <span className="text-[11px] text-brass">Too long for a URL — saved locally only</span>
      ) : null}

      <button
        type="button"
        onClick={onResetLayout}
        className="rounded-md border border-line px-2.5 py-1.5 text-[12px] text-muted hover:border-muted hover:text-ink"
      >
        Reset layout
      </button>

      <a
        href={REPO}
        target="_blank"
        rel="noreferrer"
        className="text-[12px] text-muted hover:text-ink"
      >
        GitHub
      </a>
      <a
        href={`${REPO}/issues`}
        target="_blank"
        rel="noreferrer"
        className="text-[12px] text-muted hover:text-ink"
      >
        Issues
      </a>

      <span
        className={[
          'ml-auto font-mono text-[12px]',
          statusKind === 'ok' ? 'text-teal' : '',
          statusKind === 'err' ? 'text-coral' : '',
          statusKind === '' ? 'text-muted' : '',
        ].join(' ')}
      >
        {statusText}
      </span>
    </header>
  )
}
