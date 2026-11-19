import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Confirm, Sheet } from '../components/Sheet'
import { db, today, uid } from '../db'
import type { Measure, Session, SetLog } from '../types'

export default function History() {
  const [tab, setTab] = useState<'treinos' | 'evolucao' | 'medidas'>('treinos')
  const sessions = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().toArray(), [])
  const logs = useLiveQuery(() => db.logs.toArray(), [])

  return (
    <div className="page">
      <h1>Histórico</h1>
      <div className="tabs">
        <button className={tab === 'treinos' ? 'active' : ''} onClick={() => setTab('treinos')}>
          Treinos
        </button>
        <button className={tab === 'evolucao' ? 'active' : ''} onClick={() => setTab('evolucao')}>
          Evolução
        </button>
        <button className={tab === 'medidas' ? 'active' : ''} onClick={() => setTab('medidas')}>
          Medidas
        </button>
      </div>
      {tab === 'treinos' ? (
        <SessionList sessions={sessions ?? []} logs={logs ?? []} />
      ) : tab === 'evolucao' ? (
        <Progress logs={logs ?? []} />
      ) : (
        <Measures />
      )}
    </div>
  )
}

function SessionList({ sessions, logs }: { sessions: Session[]; logs: SetLog[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<Session | null>(null)

  if (!sessions.length) return <div className="card muted">Nenhum treino registrado ainda.</div>

  return (
    <div className="list">
      <Heatmap sessions={sessions} />
      {sessions.map((s) => {
        const sl = logs.filter((l) => l.sessionId === s.id)
        const volume = sl.reduce((v, l) => v + l.weight * l.reps, 0)
        const byEx = groupBy(sl, (l) => l.exerciseName)
        const mins = s.finishedAt ? Math.round((s.finishedAt - s.startedAt) / 60000) : null
        return (
          <div key={s.id} className="card">
            <button className="row text-left" onClick={() => setOpen(open === s.id ? null : s.id)}>
              <div className="grow">
                <div className="title">{s.workoutName}</div>
                <div className="muted small">
                  {new Date(s.startedAt).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                  {' · '}
                  {s.skipped ? (
                    '⏭ Pulado'
                  ) : (
                    <>
                      {sl.length} séries · {Math.round(volume).toLocaleString('pt-BR')} kg
                      {mins != null ? ` · ${mins} min` : ' · em andamento'}
                    </>
                  )}
                </div>
              </div>
              <span>{open === s.id ? '▾' : '▸'}</span>
            </button>
            {open === s.id && (
              <div className="detail">
                {Object.entries(byEx).map(([name, ls]) => (
                  <div key={name} className="detail-row">
                    <div className="small">{name}</div>
                    <div className="muted small">
                      {ls
                        .sort((a, b) => a.setIndex - b.setIndex)
                        .map((l) => `${l.weight}×${l.reps}`)
                        .join(' · ')}
                    </div>
                  </div>
                ))}
                <button className="btn btn-ghost btn-sm btn-danger" onClick={() => setToDelete(s)}>
                  {s.skipped ? 'Desfazer o pulo' : 'Apagar este treino'}
                </button>
              </div>
            )}
          </div>
        )
      })}
      {toDelete && (
        <Confirm
          title="Apagar este treino do histórico?"
          confirmLabel="Apagar"
          onCancel={() => setToDelete(null)}
          onConfirm={async () => {
            await db.transaction('rw', db.sessions, db.logs, async () => {
              await db.logs.where('sessionId').equals(toDelete.id).delete()
              await db.sessions.delete(toDelete.id)
            })
            setToDelete(null)
          }}
        />
      )}
    </div>
  )
}

/** Calendário das últimas 12 semanas: um quadrado por dia (colunas = semanas, seg → dom) */
function Heatmap({ sessions }: { sessions: Session[] }) {
  const p = (n: number) => String(n).padStart(2, '0')
  const key = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
  const trained = new Set(sessions.filter((s) => !s.skipped).map((s) => s.date))
  const skipped = new Set(sessions.filter((s) => s.skipped).map((s) => s.date))
  const end = new Date()
  end.setHours(12, 0, 0, 0)
  // Começa na segunda-feira, 11 semanas antes da semana atual
  const start = new Date(end)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 11 * 7)
  const days = Array.from({ length: 12 * 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
  const todayKey = key(end)
  const total = days.filter((d) => trained.has(key(d))).length

  return (
    <div className="card">
      <div className="row">
        <div className="title grow">Frequência</div>
        <div className="muted small">{total} treinos em 12 semanas</div>
      </div>
      <div className="heatmap" aria-hidden>
        {days.map((d) => {
          const k = key(d)
          const cls = trained.has(k) ? 'hm-on' : skipped.has(k) ? 'hm-skip' : ''
          return <span key={k} className={`hm ${cls} ${k > todayKey ? 'hm-future' : ''}`} title={k} />
        })}
      </div>
    </div>
  )
}

function Measures() {
  const measures = useLiveQuery(() => db.measures.orderBy('date').reverse().toArray(), [])
  const [editing, setEditing] = useState<Measure | null>(null)
  const [toDelete, setToDelete] = useState<Measure | null>(null)
  const list = measures ?? []
  const asc = [...list].reverse()
  const series = (k: 'weight' | 'waist' | 'bodyFat') => asc.filter((m) => m[k] != null).map((m) => m[k] as number)
  const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR')

  return (
    <div className="list">
      <button className="btn btn-block" onClick={() => setEditing({ id: uid(), date: today() })}>
        + Nova medida
      </button>
      {(
        [
          ['weight', 'Peso', 'kg'],
          ['waist', 'Cintura', 'cm'],
          ['bodyFat', 'Gordura', '%'],
        ] as const
      ).map(([k, label, unit]) => {
        const v = series(k)
        if (!v.length) return null
        const diff = Math.round((v[v.length - 1] - v[0]) * 10) / 10
        return (
          <div key={k} className="card">
            <div className="row">
              <div className="grow">
                <div className="title">{label}</div>
                <div className="muted small">
                  Atual {v[v.length - 1]} {unit}
                </div>
              </div>
              {v.length > 1 && (
                <div className={`chip ${diff < 0 ? 'chip-accent' : ''}`}>
                  {diff > 0 ? '+' : ''}
                  {diff} {unit}
                </div>
              )}
            </div>
            <Spark values={v} />
          </div>
        )
      })}
      {list.length === 0 && <div className="card muted">Registre peso, cintura ou % de gordura para acompanhar.</div>}
      {list.map((m) => (
        <button key={m.id} className="card row text-left" onClick={() => setEditing(m)}>
          <div className="grow">
            <div className="title">{fmtDate(m.date)}</div>
            <div className="muted small">
              {[
                m.weight != null && `${m.weight} kg`,
                m.waist != null && `cintura ${m.waist} cm`,
                m.bodyFat != null && `${m.bodyFat}% gordura`,
              ]
                .filter(Boolean)
                .join(' · ') || 'Sem valores'}
            </div>
            {m.notes && <div className="muted small">{m.notes}</div>}
          </div>
        </button>
      ))}
      {editing && (
        <MeasureSheet
          measure={editing}
          isNew={!list.some((m) => m.id === editing.id)}
          onClose={() => setEditing(null)}
          onDelete={() => {
            setToDelete(editing)
            setEditing(null)
          }}
        />
      )}
      {toDelete && (
        <Confirm
          title="Apagar esta medida?"
          confirmLabel="Apagar"
          onCancel={() => setToDelete(null)}
          onConfirm={async () => {
            await db.measures.delete(toDelete.id)
            setToDelete(null)
          }}
        />
      )}
    </div>
  )
}

function MeasureSheet({
  measure,
  isNew,
  onClose,
  onDelete,
}: {
  measure: Measure
  isNew: boolean
  onClose: () => void
  onDelete: () => void
}) {
  const [date, setDate] = useState(measure.date)
  const [weight, setWeight] = useState(measure.weight?.toString() ?? '')
  const [waist, setWaist] = useState(measure.waist?.toString() ?? '')
  const [bodyFat, setBodyFat] = useState(measure.bodyFat?.toString() ?? '')
  const [notes, setNotes] = useState(measure.notes ?? '')
  const num = (s: string) => {
    const n = parseFloat(s.replace(',', '.'))
    return Number.isNaN(n) ? undefined : n
  }
  const hasValue = [weight, waist, bodyFat].some((s) => num(s) != null)

  return (
    <Sheet title={isNew ? 'Nova medida' : 'Editar medida'} onClose={onClose}>
      <label className="field">
        <span>Data</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className="field">
        <span>Peso (kg)</span>
        <input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
      </label>
      <label className="field">
        <span>Cintura (cm)</span>
        <input inputMode="decimal" value={waist} onChange={(e) => setWaist(e.target.value)} />
      </label>
      <label className="field">
        <span>Gordura corporal (%)</span>
        <input inputMode="decimal" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} />
      </label>
      <label className="field">
        <span>Anotação</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="actions">
        {!isNew && (
          <button className="btn btn-ghost btn-danger" onClick={onDelete}>
            Apagar
          </button>
        )}
        <button
          className="btn"
          disabled={!hasValue || !date}
          onClick={async () => {
            await db.measures.put({
              id: measure.id,
              date,
              weight: num(weight),
              waist: num(waist),
              bodyFat: num(bodyFat),
              notes: notes.trim() || undefined,
            })
            onClose()
          }}
        >
          Salvar
        </button>
      </div>
    </Sheet>
  )
}

function Progress({ logs }: { logs: SetLog[] }) {
  const rows = useMemo(() => {
    const byEx = groupBy(logs, (l) => l.exerciseName)
    return Object.entries(byEx)
      .map(([name, ls]) => {
        const bySession = groupBy(ls, (l) => l.sessionId)
        // Carga máxima de cada sessão, em ordem cronológica
        const series = Object.values(bySession)
          .map((s) => ({ ts: Math.min(...s.map((l) => l.ts)), max: Math.max(...s.map((l) => l.weight)) }))
          .sort((a, b) => a.ts - b.ts)
        const first = series[0]?.max ?? 0
        const last = series[series.length - 1]?.max ?? 0
        const best = Math.max(...series.map((s) => s.max))
        // 1RM estimado (Epley) usando a melhor série de todas
        const e1rm = Math.round(Math.max(...ls.map((l) => l.weight * (1 + l.reps / 30))))
        return { name, series, first, last, best, e1rm, lastTs: series[series.length - 1]?.ts ?? 0 }
      })
      .sort((a, b) => b.lastTs - a.lastTs)
  }, [logs])

  if (!rows.length) return <div className="card muted">Registre algumas séries para ver a evolução.</div>

  return (
    <div className="list">
      {rows.map((r) => {
        const diff = r.last - r.first
        return (
          <div key={r.name} className="card">
            <div className="row">
              <div className="grow">
                <div className="title">{r.name}</div>
                <div className="muted small">
                  Recorde {r.best} kg · 1RM est. {r.e1rm} kg · {r.series.length} {r.series.length === 1 ? 'treino' : 'treinos'}
                </div>
              </div>
              {r.series.length > 1 && (
                <div className={`chip ${diff > 0 ? 'chip-accent' : ''}`}>
                  {diff > 0 ? '+' : ''}
                  {diff} kg
                </div>
              )}
            </div>
            <Spark values={r.series.map((s) => s.max)} />
          </div>
        )
      })}
    </div>
  )
}

function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const w = 300
  const h = 40
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * w},${h - 4 - ((v - min) / span) * (h - 8)}`)
    .join(' ')
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function groupBy<T>(arr: T[], key: (t: T) => string) {
  return arr.reduce<Record<string, T[]>>((acc, x) => {
    ;(acc[key(x)] ||= []).push(x)
    return acc
  }, {})
}
