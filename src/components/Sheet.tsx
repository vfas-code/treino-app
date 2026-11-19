import type { ReactNode } from 'react'

/** Painel que sobe de baixo (substitui alert/confirm, que não funcionam bem em PWA) */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <div className="title">{title}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Confirm({
  title,
  text,
  confirmLabel = 'Confirmar',
  onConfirm,
  onCancel,
}: {
  title: string
  text?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Sheet title={title} onClose={onCancel}>
      {text && <p className="muted">{text}</p>}
      <div className="actions">
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn btn-danger-solid" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Sheet>
  )
}
