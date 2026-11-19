import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { db, today } from '../db'
import { useActivePlan, WEEKDAYS } from '../hooks'

export default function Home() {
  const { loading, plan } = useActivePlan()
  const weekday = new Date().getDay()

  const doneToday = useLiveQuery(
    () => db.sessions.where('date').equals(today()).toArray(),
    [],
  )
  const recent = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().limit(5).toArray(), [])

  if (loading) return <div className="page">Carregando…</div>
  if (!plan)
    return (
      <div className="page">
        <h1>Treino</h1>
        <div className="card">
          <p>Nenhum plano ativo.</p>
          <Link className="btn" to="/planos">
            Escolher ou criar plano
          </Link>
        </div>
      </div>
    )

  const todayId = plan.schedule[weekday]
  const todayWorkout = plan.workouts.find((w) => w.id === todayId)

  return (
    <div className="page">
      <div className="eyebrow">{WEEKDAYS[weekday]}</div>
      <h1>{plan.name}</h1>

      {todayWorkout ? (
        <Link to={`/treino/${todayWorkout.id}`} className="card card-hero">
          <div className="eyebrow">Treino de hoje</div>
          <div className="hero-title">{todayWorkout.name}</div>
          <div className="muted">
            {todayWorkout.focus} · {todayWorkout.exercises.length} exercícios
          </div>
          {todayWorkout.cardio && <div className="chip">🏃 {todayWorkout.cardio}</div>}
          <div className="btn btn-block">
            {doneToday?.some((s) => s.workoutId === todayWorkout.id) ? 'Continuar treino' : 'Começar treino'}
          </div>
        </Link>
      ) : (
        <div className="card card-hero">
          <div className="eyebrow">Hoje</div>
          <div className="hero-title">Descanso 😴</div>
          <div className="muted">Escolha um treino abaixo se quiser treinar mesmo assim.</div>
        </div>
      )}

      <h2>Todos os treinos</h2>
      <div className="list">
        {plan.workouts.map((w) => {
          const days = Object.entries(plan.schedule)
            .filter(([, id]) => id === w.id)
            .map(([d]) => WEEKDAYS[Number(d)].slice(0, 3))
          return (
            <Link key={w.id} to={`/treino/${w.id}`} className="card row">
              <div className="grow">
                <div className="title">{w.name}</div>
                <div className="muted small">
                  {w.focus ? `${w.focus} · ` : ''}
                  {w.exercises.length} exercícios
                </div>
              </div>
              {days.length > 0 && <div className="chip">{days.join(', ')}</div>}
            </Link>
          )
        })}
        {plan.workouts.length === 0 && (
          <div className="card muted">
            Este plano ainda não tem treinos. <Link to={`/planos/${plan.id}`}>Editar plano</Link>
          </div>
        )}
      </div>

      {recent && recent.length > 0 && (
        <>
          <h2>Últimos treinos</h2>
          <div className="list">
            {recent.map((s) => (
              <Link key={s.id} to="/historico" className="card row">
                <div className="grow">
                  <div className="title">{s.workoutName}</div>
                  <div className="muted small">{new Date(s.startedAt).toLocaleDateString('pt-BR')}</div>
                </div>
                <div className="chip">{s.finishedAt ? '✅' : '⏳'}</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
