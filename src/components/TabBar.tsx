export function TabBar<Id extends string>({
  items,
  value,
  onChange,
  uppercase = false,
}: {
  items: { id: Id; label: string }[]
  value: Id
  onChange: (id: Id) => void
  uppercase?: boolean
}) {
  return (
    <div className="flex min-w-0 items-center">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={[
            'px-2.5 py-1 font-mono text-[11px]',
            uppercase ? 'tracking-wide uppercase' : '',
            value === item.id ? 'border-b-2 border-brass text-ink' : 'text-muted hover:text-ink',
          ].join(' ')}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
