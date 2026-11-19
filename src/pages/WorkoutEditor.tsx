import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Confirm, Sheet } from '../components/Sheet'
import { hasVideo, Video } from '../components/Video'
import { db } from '../db'
import { usePlan } from '../hooks'
import { move, newExercise, saveVideoFile, updateWorkout } from '../planOps'
import { METHOD_LABEL, type Exercise, type Method } from '../types'

export default function WorkoutEditor() {
  const { planId, workoutId } = useParams()
  const plan = usePlan(planId)
  const [editing, setEditing] = useState<Exercise | null>(null)
  const [toDelete, setToDelete] = useState<Exercise | null>(null)

  if (plan === undefined) return <div className="page">Carregando…</div>
  const workout = plan?.workouts.find((w) => w.id === workoutId)
  if (!plan || !workout)
    return (
      <div className="page">
        <p>Treino não encontrado.</p>
        <Link to="/planos">Voltar</Link>
      </div>
    )

  const set = (fn: Parameters<typeof updateWorkout>[2]) => updateWorkout(plan.id, workout.id, fn)

  const saveExercise = async (ex: Exercise) => {
    await set((w) => {
      const i = w.exercises.findIndex((e) => e.id === ex.id)
      if (i >= 0) w.exercises[i] = ex
      else w.exercises.push(ex)
    })
    setEditing(null)
  }

  return (
    <div className="page">
      <div className="topbar">
        <Link to={`/planos/${plan.id}`} className="btn btn-ghost btn-sm">
          ← {plan.name}
        </Link>
        <Link to={`/treino/${workout.id}`} className="btn btn-sm">
          ▶ Treinar
        </Link>
      </div>

      <label className="field">
        <span>Nome do treino</span>
        <input defaultValue={workout.name} onBlur={(e) => set((w) => (w.name = e.target.value.trim() || w.name))} />
      </label>
      <label className="field">
        <span>Foco</span>
        <input
          defaultValue={workout.focus}
          placeholder="Ex.: Peito, ombro, tríceps"
          onBlur={(e) => set((w) => (w.focus = e.target.value))}
        />
      </label>
      <label className="field">
        <span>Cardio no final</span>
        <input
          defaultValue={workout.cardio}
          placeholder="Ex.: 3 km ritmo normal"
          onBlur={(e) => set((w) => (w.cardio = e.target.value))}
        />
      </label>

      <h2>Exercícios</h2>
      <div className="list">
        {workout.exercises.map((ex, i) => (
          <div key={ex.id} className="card row">
            <div className="reorder">
              <button onClick={() => set((w) => move(w.exercises, i, i - 1))} disabled={i === 0} aria-label="Subir">
                ▲
              </button>
              <button
                onClick={() => set((w) => move(w.exercises, i, i + 1))}
                disabled={i === workout.exercises.length - 1}
                aria-label="Descer"
              >
                ▼
              </button>
            </div>
            <button className="grow text-left" onClick={() => setEditing(structuredClone(ex))}>
              <div className="title">
                {ex.name} {hasVideo(ex) && <span title="Tem vídeo">🎬</span>}
              </div>
              <div className="muted small">
                {ex.sets} × {ex.reps} · {METHOD_LABEL[ex.method]} · {ex.rest}s
              </div>
            </button>
            <button className="btn btn-ghost btn-sm btn-danger" onClick={() => setToDelete(ex)}>
              ✕
            </button>
          </div>
        ))}
      </div>
      <button className="btn btn-block" onClick={() => setEditing(newExercise())}>
        + Adicionar exercício
      </button>

      {editing && <ExerciseForm initial={editing} onCancel={() => setEditing(null)} onSave={saveExercise} />}

      {toDelete && (
        <Confirm
          title={`Remover "${toDelete.name}"?`}
          confirmLabel="Remover"
          onCancel={() => setToDelete(null)}
          onConfirm={async () => {
            await set((w) => (w.exercises = w.exercises.filter((e) => e.id !== toDelete.id)))
            setToDelete(null)
          }}
        />
      )}
    </div>
  )
}

function ExerciseForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Exercise
  onSave: (ex: Exercise) => void
  onCancel: () => void
}) {
  const [ex, setEx] = useState<Exercise>(initial)
  const [uploading, setUploading] = useState(false)
  const patch = (p: Partial<Exercise>) => setEx((e) => ({ ...e, ...p }))

  const applyMethod = (method: Method) => {
    if (method === 'piramide') patch({ method, sets: 4, reps: '12/10/8/6', rest: 90 })
    else if (method === 'fixa') patch({ method, sets: 3, reps: '12–15', rest: 60 })
    else patch({ method })
  }

  const onFile = async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      const old = ex.videoId
      const id = await saveVideoFile(file)
      patch({ videoId: id })
      if (old) await db.videos.delete(old)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Sheet title={initial.name === 'Novo exercício' ? 'Novo exercício' : 'Editar exercício'} onClose={onCancel}>
      <label className="field">
        <span>Nome</span>
        <input value={ex.name} onChange={(e) => patch({ name: e.target.value })} autoFocus />
      </label>

      <label className="field">
        <span>Método</span>
        <select value={ex.method} onChange={(e) => applyMethod(e.target.value as Method)}>
          {Object.entries(METHOD_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>

      <div className="grid3">
        <label className="field">
          <span>Séries</span>
          <input
            inputMode="numeric"
            value={ex.sets}
            onChange={(e) => patch({ sets: Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)) })}
          />
        </label>
        <label className="field">
          <span>Reps</span>
          <input value={ex.reps} placeholder="12/10/8/6" onChange={(e) => patch({ reps: e.target.value })} />
        </label>
        <label className="field">
          <span>Descanso (s)</span>
          <input
            inputMode="numeric"
            value={ex.rest}
            onChange={(e) => patch({ rest: Math.max(0, parseInt(e.target.value, 10) || 0) })}
          />
        </label>
      </div>

      <label className="field">
        <span>Observação</span>
        <textarea rows={2} value={ex.notes ?? ''} onChange={(e) => patch({ notes: e.target.value })} />
      </label>

      <label className="field">
        <span>Link do vídeo (YouTube)</span>
        <input
          type="url"
          inputMode="url"
          placeholder="https://youtu.be/…"
          value={ex.videoUrl ?? ''}
          onChange={(e) => patch({ videoUrl: e.target.value })}
        />
      </label>

      <div className="field">
        <span>Ou um vídeo seu (gravado no celular)</span>
        <div className="actions">
          <label className="btn btn-ghost btn-sm">
            {uploading ? 'Salvando…' : ex.videoId ? 'Trocar vídeo' : '📹 Escolher vídeo'}
            <input type="file" accept="video/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {ex.videoId && (
            <button className="btn btn-ghost btn-sm btn-danger" onClick={() => patch({ videoId: undefined })}>
              Remover vídeo
            </button>
          )}
        </div>
        <small className="muted">O vídeo próprio tem prioridade sobre o link e fica salvo só neste aparelho.</small>
      </div>

      {hasVideo(ex) && <Video videoUrl={ex.videoUrl} videoId={ex.videoId} />}

      <div className="actions">
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn" onClick={() => onSave({ ...ex, name: ex.name.trim() || 'Exercício' })}>
          Salvar
        </button>
      </div>
    </Sheet>
  )
}
