import { StateEffect, StateField, RangeSet } from '@codemirror/state'
import { GutterMarker, gutter } from '@codemirror/view'

export const setAstPin = StateEffect.define<number | null>()

export const astPinField = StateField.define<number | null>({
  create: () => null,
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setAstPin)) return effect.value
    }
    return value
  },
})

class PinMarker extends GutterMarker {
  toDOM() {
    const mark = document.createElement('span')
    mark.className = 'cm-ast-pin'
    mark.title = 'Pinned'
    mark.textContent = '●'
    return mark
  }
}

const pinMarker = new PinMarker()

export const astPinGutter = [
  astPinField,
  gutter({
    class: 'cm-ast-pin-gutter',
    markers: (view) => {
      const lineFrom = view.state.field(astPinField)
      if (lineFrom == null) return RangeSet.empty
      const line = view.state.doc.line(Math.min(lineFrom + 1, view.state.doc.lines))
      return RangeSet.of([pinMarker.range(line.from)])
    },
  }),
]
