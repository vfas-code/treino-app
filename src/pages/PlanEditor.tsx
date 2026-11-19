import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Confirm } from '../components/Sheet'
import { setSetting } from '../db'
import { useActivePlanId, usePlan, WEEKDAYS } from '../hooks'
import { move, newWorkout, updatePlan } from '../planOps'
import type { Workout } from '../types'

export default function PlanEditor() {
  const { planId } = useParams()
  const plan = usePlan(planId)
  const activeId = useActivePlanId()
  const [toDelete, setToDelete] = useState<Workout | null>(null)

  if (plan === undefined) return <div className="page">Carregando…</div>
  if (!plan)
    return (
      <div className="page">
        <p>Plano não encontrado.</p>
        <Link to="/planos">Voltar</Link>
      </div>
    )

  const set = (fn: Parameters<typeof updatePlan>[1]) => updatePlan(plan.id, fn)

  return (
    <div className="page">
      <div className="topbar">
        <Link to="/planos" className="btn btn-ghost btn-sm">
          ← Planos
        </Link>
        {plan.id !== activeId ? (
          <button className="btn btn-sm" onClick={() => setSetting('activePlanId', plan.id)}>
            Ativar este plano
          </button>
        ) : (
          <span className="chip chip-accent">Ativo</span>
        )}
      </div>

      <label className="field">
        <span>Nome do plano</span>
        <input defaultValue={plan.name} onBlur={(e) => set((p) => (p.name = e.target.value.trim() || p.name))} />
      </label>
      <label className="field">
        <span>Descrição</span>
        <textarea
          rows={2}
          defaultValue={plan.description}
          onBlur={(e) => set((p) => (p.description = e.target.value))}
        />
      </label>

      <h2>Treinos</h2>
      <div className="list">
        {plan.workouts.map((w, i) => (
          <div key={w.id} className="card row">
            <div className="reorder">
              <button onClick={() => set((p) => move(p.workouts, i, i - 1))} disabled={i === 0} aria-label="Subir">
                ▲
              </button>
              <button
                onClick={() => set((p) => move(p.workouts, i, i + 1))}
                disabled={i === plan.workouts.length - 1}
                aria-label="Descer"
              >
                ▼
              </button>
            </div>
            <Link to={`/planos/${plan.id}/${w.id}`} className="grow">
              <div className="title">{w.name}</div>
              <div className="muted small">{w.exercises.length} exercícios</div>
            </Link>
            <button className="btn btn-ghost btn-sm btn-danger" onClick={() => setToDelete(w)}>
              ✕
            </button>
          </div>
        ))}
      </div>
      <button className="btn btn-block" onClick={() => set((p) => void p.workouts.push(newWorkout(p.workouts.length)))}>
        + Adicionar treino
      </button>

      <h2>Agenda da semana</h2>
      <div className="card">
        {WEEKDAYS.map((d, i) => (
          <label key={d} className="field field-inline">
            <span>{d}</span>
            <select
              value={plan.schedule[i] ?? ''}
              onChange={(e) => set((p) => (p.schedule[i] = e.target.value || undefined))}
            >
              <option value="">Descanso</option>
              {plan.workouts.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {toDelete && (
        <Confirm
          title={`Excluir "${toDelete.name}"?`}
          confirmLabel="Excluir"
          onCancel={() => setToDelete(null)}
          onConfirm={async () => {
            await set((p) => {
              p.workouts = p.workouts.filter((w) => w.id !== toDelete.id)
              for (const k of Object.keys(p.schedule)) {
                if (p.schedule[Number(k)] === toDelete.id) p.schedule[Number(k)] = undefined
              }
            })
            setToDelete(null)
          }}
        />
      )}
    </div>
  )
}
