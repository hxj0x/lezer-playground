import { getReferenceLanguage } from '../referenceLanguages'

export function ReferenceHint({ languageId }: { languageId: string }) {
  const lang = getReferenceLanguage(languageId)
  if (!lang) return null

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-lg border border-line bg-panel-alt px-4 py-2">
      <p className="min-w-0 flex-1 text-[12px] text-muted">
        Using official <span className="font-mono text-ink">{lang.packageName}</span> (read-only)
      </p>
      <a
        href={lang.repoUrl}
        target="_blank"
        rel="noreferrer"
        className="text-[12px] text-ink underline-offset-2 hover:underline"
      >
        Package repository
      </a>
    </div>
  )
}
