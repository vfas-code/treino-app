import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Confirm } from '../components/Sheet'
import { db } from '../db'
import type { Session, SetLog } from '../types'

export default function History() {
  const [tab, setTab] = useState<'treinos' | 'evolucao'>('treinos')
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
          Evolução de carga
        </button>
      </div>
      {tab === 'treinos' ? (
        <SessionList sessions={sessions ?? []} logs={logs ?? []} />
      ) : (
        <Progress logs={logs ?? []} />
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
                  {sl.length} séries · {Math.round(volume).toLocaleString('pt-BR')} kg
                  {mins != null ? ` · ${mins} min` : ' · em andamento'}
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
                  Apagar este treino
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
        return { name, series, first, last, best, lastTs: series[series.length - 1]?.ts ?? 0 }
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
                  Recorde {r.best} kg · {r.series.length} {r.series.length === 1 ? 'treino' : 'treinos'}
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
