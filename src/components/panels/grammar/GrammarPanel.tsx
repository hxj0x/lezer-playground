import { grammarLanguage } from '../../../cmSetup'
import { grammarCompletion, grammarHover } from '../../../cm/grammarAssist'
import { useCompileStore } from '../../../playground/compileStore'
import { useSourceStore } from '../../../playground/sourceStore'
import { CodeEditor } from '../../CodeEditor'

const GRAMMAR_EXTS = [grammarLanguage(), grammarCompletion, grammarHover]

export function GrammarPanel() {
  const grammar = useSourceStore((s) => s.grammar)
  const setGrammar = useSourceStore((s) => s.setGrammar)
  const diagnostics = useCompileStore((s) => s.grammarDiagnostics)

  return (
    <CodeEditor
      doc={grammar}
      onChange={setGrammar}
      extensions={GRAMMAR_EXTS}
      diagnostics={diagnostics}
    />
  )
}
