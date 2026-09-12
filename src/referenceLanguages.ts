import { parser as javaParser } from '@lezer/java'
import { parser as jsonParser } from '@lezer/json'
import type { LRParser } from '@lezer/lr'
import { parser as pythonParser } from '@lezer/python'

export interface ReferenceLanguage {
  id: string
  label: string
  packageName: string
  parser: LRParser
  placeholder: string
  repoUrl: string
}

export const referenceLanguages: ReferenceLanguage[] = [
  {
    id: 'python',
    label: 'Python',
    packageName: '@lezer/python',
    parser: pythonParser,
    placeholder: 'def greet(name):\n    print(f"hello {name}")\n',
    repoUrl: 'https://code.haverbeke.berlin/lezer/python',
  },
  {
    id: 'json',
    label: 'JSON',
    packageName: '@lezer/json',
    parser: jsonParser,
    placeholder: '{\n  "a": 1,\n  "b": [true, null, "x"]\n}\n',
    repoUrl: 'https://github.com/lezer-parser/json',
  },
  {
    id: 'java',
    label: 'Java',
    packageName: '@lezer/java',
    parser: javaParser,
    placeholder: 'class Hello {\n  void greet() {\n    System.out.println("hi");\n  }\n}\n',
    repoUrl: 'https://code.haverbeke.berlin/lezer/java',
  },
]

export function getReferenceLanguage(id: string) {
  return referenceLanguages.find((item) => item.id === id) ?? null
}

export function referenceSampleFor(languageId: string, current: string) {
  const lang = getReferenceLanguage(languageId)
  if (!lang) return current
  if (!current) return lang.placeholder
  const stale = referenceLanguages.some((item) => item.id !== languageId && item.placeholder === current)
  return stale ? lang.placeholder : current
}
