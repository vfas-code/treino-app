import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { hasVideo, Video } from '../components/Video'
import { useRestTimer } from '../components/RestTimer'
import { bestWeightFor, db, lastLogsFor, today, uid } from '../db'
import { useActivePlan } from '../hooks'
import { METHOD_LABEL, type Exercise, type SetLog, type Workout } from '../types'

/** Repetições-alvo da série: "12/10/8/6" → por série; "12–15" → 12 */
export function targetReps(reps: string, setIndex: number): number | undefined {
  const parts = reps.split('/').map((s) => parseInt(s, 10))
  if (parts.length > 1 && !Number.isNaN(parts[setIndex])) return parts[setIndex]
  const m = reps.match(/\d+/)
  return m ? parseInt(m[0], 10) : undefined
}

export default function WorkoutSession() {
  const { workoutId } = useParams()
  const navigate = useNavigate()
  const { loading, plan } = useActivePlan()
  const workout = plan?.workouts.find((w) => w.id === workoutId)

  // Sessão de hoje para este treino (se já existir)
  const existing = useLiveQuery(
    async () =>
      workoutId
        ? (await db.sessions.where('date').equals(today()).toArray()).find((s) => s.workoutId === workoutId && !s.skipped) ?? null
        : null,
    [workoutId],
  )
  const sessionId = existing?.id ?? null
  const logs = useLiveQuery(
    async () => (sessionId ? db.logs.where('sessionId').equals(sessionId).toArray() : []),
    [sessionId],
  )

  // Mantém a tela acesa durante o treino (quando o navegador permite)
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const request = async () => {
      try {
        lock = (await navigator.wakeLock?.request('screen')) ?? null
      } catch {
        lock = null
      }
    }
    void request()
    const onVisible = () => document.visibilityState === 'visible' && void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [])

  if (loading || existing === undefined) return <div className="page">Carregando…</div>
  if (!plan || !workout)
    return (
      <div className="page">
        <p>Treino não encontrado no plano ativo.</p>
        <Link to="/">Voltar</Link>
      </div>
    )

  const ensureSession = async () => {
    if (sessionId) return sessionId
    const id = uid()
    await db.sessions.add({
      id,
      planId: plan.id,
      workoutId: workout.id,
      workoutName: workout.name,
      date: today(),
      startedAt: Date.now(),
    })
    return id
  }

  const totalSets = workout.exercises.reduce((n, e) => n + e.sets, 0)
  const doneSets = logs?.length ?? 0
  const volume = (logs ?? []).reduce((v, l) => v + l.weight * l.reps, 0)

  const finish = async () => {
    if (sessionId) await db.sessions.update(sessionId, { finishedAt: Date.now() })
    navigate('/')
  }

  return (
    <div className="page">
      <div className="topbar">
        <Link to="/" className="btn btn-ghost btn-sm">
          ← Voltar
        </Link>
        <Link to={`/planos/${plan.id}/${workout.id}`} className="btn btn-ghost btn-sm">
          ✏️ Editar
        </Link>
      </div>
      <h1>{workout.name}</h1>
      {workout.focus && <div className="muted">{workout.focus}</div>}

      <div className="progress">
        <div className="progress-bar" style={{ width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%` }} />
      </div>
      <div className="muted small">
        {doneSets}/{totalSets} séries · volume {Math.round(volume).toLocaleString('pt-BR')} kg
        {existing?.finishedAt ? ' · ✅ finalizado' : ''}
      </div>

      <div className="list">
        {workout.exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.id}
            index={i}
            ex={ex}
            sessionId={sessionId}
            logs={(logs ?? []).filter((l) => l.exerciseId === ex.id)}
            ensureSession={ensureSession}
          />
        ))}
      </div>

      <CardioCard workout={workout} />

      <button className="btn btn-block btn-lg" onClick={finish}>
        ✅ Finalizar treino
      </button>
    </div>
  )
}

function CardioCard({ workout }: { workout: Workout }) {
  if (!workout.cardio) return null
  return (
    <div className="card">
      <div className="title">🏃 Cardio no final</div>
      <div className="muted">{workout.cardio}</div>
    </div>
  )
}

function ExerciseCard({
  ex,
  index,
  sessionId,
  logs,
  ensureSession,
}: {
  ex: Exercise
  index: number
  sessionId: string | null
  logs: SetLog[]
  ensureSession: () => Promise<string>
}) {
  const [showVideo, setShowVideo] = useState(false)
  const [prev, setPrev] = useState<SetLog[]>([])
  const [best, setBest] = useState(0)
  const timer = useRestTimer()
  const done = logs.length >= ex.sets

  useEffect(() => {
    lastLogsFor(ex.id, ex.name, sessionId ?? undefined).then(setPrev)
    bestWeightFor(ex.id, ex.name, sessionId ?? undefined).then(setBest)
  }, [ex.id, ex.name, sessionId])

  return (
    <div className={`card exercise ${done ? 'exercise-done' : ''}`}>
      <div className="row">
        <div className="num">{index + 1}</div>
        <div className="grow">
          <div className="title">{ex.name}</div>
          <div className="muted small">
            {ex.sets} × {ex.reps} · {METHOD_LABEL[ex.method]} · descanso {ex.rest}s
          </div>
        </div>
        {hasVideo(ex) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowVideo((v) => !v)}>
            {showVideo ? 'Fechar' : '▶ Vídeo'}
          </button>
        )}
      </div>
      {ex.notes && <div className="note">💡 {ex.notes}</div>}
      {showVideo && <Video videoUrl={ex.videoUrl} videoId={ex.videoId} />}

      <div className="sets">
        <div className="set-head">
          <span>Série</span>
          <span>Anterior</span>
          <span>kg</span>
          <span>Reps</span>
          <span />
        </div>
        {Array.from({ length: ex.sets }, (_, s) => (
          <SetRow
            key={s}
            setIndex={s}
            ex={ex}
            log={logs.find((l) => l.setIndex === s)}
            prev={prev.find((l) => l.setIndex === s)}
            best={best}
            onSave={async (weight, reps) => {
              const sid = await ensureSession()
              await db.logs.add({
                sessionId: sid,
                exerciseId: ex.id,
                exerciseName: ex.name,
                setIndex: s,
                weight,
                reps,
                ts: Date.now(),
              })
              if (s < ex.sets - 1) timer.start(ex.rest, `· ${ex.name}`)
            }}
          />
        ))}
      </div>
    </div>
  )
}

function SetRow({
  setIndex,
  ex,
  log,
  prev,
  best,
  onSave,
}: {
  setIndex: number
  ex: Exercise
  log?: SetLog
  prev?: SetLog
  /** Maior carga de sessões anteriores (para marcar recorde) */
  best: number
  onSave: (weight: number, reps: number) => Promise<void>
}) {
  const target = targetReps(ex.reps, setIndex)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')

  const save = async () => {
    const w = parseFloat((weight || String(prev?.weight ?? 0)).replace(',', '.'))
    const r = parseInt(reps || String(target ?? prev?.reps ?? 0), 10)
    await onSave(Number.isNaN(w) ? 0 : w, Number.isNaN(r) ? 0 : r)
  }

  const undo = async () => {
    if (log?.id != null) {
      setWeight(String(log.weight))
      setReps(String(log.reps))
      await db.logs.delete(log.id)
    }
  }

  return (
    <div className={`set-row ${log ? 'set-done' : ''}`}>
      <span className="set-num">{setIndex + 1}</span>
      <span className="muted small">{prev ? `${prev.weight}kg × ${prev.reps}` : '—'}</span>
      {log ? (
        <>
          <span className="set-val">
            {best > 0 && log.weight > best ? '🏆 ' : ''}
            {log.weight}
          </span>
          <span className="set-val">{log.reps}</span>
          <button className="check checked" onClick={undo} aria-label="Desfazer série">
            ✓
          </button>
        </>
      ) : (
        <>
          <input
            inputMode="decimal"
            placeholder={prev ? String(prev.weight) : 'kg'}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <input
            inputMode="numeric"
            placeholder={target ? String(target) : 'reps'}
            value={reps}
            onChange={(e) => setReps(e.target.value)}
          />
          <button className="check" onClick={save} aria-label="Concluir série">
            ✓
          </button>
        </>
      )}
    </div>
  )
}
