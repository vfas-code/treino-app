import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Confirm } from '../components/Sheet'
import { db, today, uid } from '../db'
import { useActivePlan, useScheduleMode, WEEKDAYS } from '../hooks'
import type { Workout } from '../types'

export default function Home() {
  const { loading, plan } = useActivePlan()
  const weekday = new Date().getDay()

  const doneToday = useLiveQuery(
    () => db.sessions.where('date').equals(today()).toArray(),
    [],
  )
  const recent = useLiveQuery(() => db.sessions.orderBy('startedAt').reverse().limit(5).toArray(), [])
  const mode = useScheduleMode()
  const planId = plan?.id
  // Última sessão (feita ou pulada) do plano ativo: base da sequência
  const last = useLiveQuery(
    async () =>
      planId ? ((await db.sessions.orderBy('startedAt').reverse().filter((s) => s.planId === planId).first()) ?? null) : null,
    [planId],
  )
  const [confirmSkip, setConfirmSkip] = useState(false)
  // Resumo da semana (segunda a domingo)
  const week = useLiveQuery(async () => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const from = d.getTime()
    const sessions = (await db.sessions.where('startedAt').aboveOrEqual(from).toArray()).filter((s) => !s.skipped)
    const logs = await db.logs.where('ts').aboveOrEqual(from).toArray()
    return {
      workouts: sessions.length,
      sets: logs.length,
      volume: Math.round(logs.reduce((v, l) => v + l.weight * l.reps, 0)),
    }
  }, [])

  if (loading || mode === undefined || last === undefined) return <div className="page">Carregando…</div>
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
  const hasAgenda = Object.values(plan.schedule).some(Boolean)
  const isRestDay = hasAgenda && !todayId

  // Sequência: nos dias de treino da agenda, sugere o seguinte ao último feito/pulado
  let todayWorkout: Workout | undefined
  let inProgress = false
  if (mode === 'sequencia') {
    if (!isRestDay && plan.workouts.length) {
      const lastIdx = last ? plan.workouts.findIndex((w) => w.id === last.workoutId) : -1
      if (last && lastIdx >= 0 && last.date === today() && !last.finishedAt && !last.skipped) {
        todayWorkout = plan.workouts[lastIdx] // treino de hoje ainda em andamento
        inProgress = true
      } else {
        todayWorkout = plan.workouts[(lastIdx + 1) % plan.workouts.length]
      }
    }
  } else {
    todayWorkout = plan.workouts.find((w) => w.id === todayId)
  }
  const skipToday = async () => {
    if (!todayWorkout) return
    const now = Date.now()
    await db.sessions.add({
      id: uid(),
      planId: plan.id,
      workoutId: todayWorkout.id,
      workoutName: todayWorkout.name,
      date: today(),
      startedAt: now,
      finishedAt: now,
      skipped: true,
    })
    setConfirmSkip(false)
  }

  return (
    <div className="page">
      <div className="eyebrow">{WEEKDAYS[weekday]}</div>
      <h1>{plan.name}</h1>

      {todayWorkout && mode === 'sequencia' ? (
        <div className="card card-hero">
          <div className="eyebrow">{inProgress ? 'Treino em andamento' : 'Próximo treino'}</div>
          <div className="hero-title">{todayWorkout.name}</div>
          <div className="muted">
            {todayWorkout.focus} · {todayWorkout.exercises.length} exercícios
          </div>
          {todayWorkout.cardio && <div className="chip">🏃 {todayWorkout.cardio}</div>}
          <Link to={`/treino/${todayWorkout.id}`} className="btn btn-block">
            {inProgress ? 'Continuar treino' : 'Começar treino'}
          </Link>
          {!inProgress && (
            <button className="btn btn-ghost btn-block" onClick={() => setConfirmSkip(true)}>
              ⏭ Pular este treino
            </button>
          )}
        </div>
      ) : todayWorkout ? (
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

      {week && week.workouts > 0 && (
        <div className="card row">
          <div className="grow">
            <div className="title">Esta semana</div>
            <div className="muted small">
              {week.workouts} {week.workouts === 1 ? 'treino' : 'treinos'} · {week.sets} séries ·{' '}
              {week.volume.toLocaleString('pt-BR')} kg
            </div>
          </div>
          <div className="chip chip-accent">🔥 {week.workouts}</div>
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
                <div className="chip">{s.skipped ? '⏭' : s.finishedAt ? '✅' : '⏳'}</div>
              </Link>
            ))}
          </div>
        </>
      )}
      {confirmSkip && todayWorkout && (
        <Confirm
          title={`Pular ${todayWorkout.name}?`}
          text="Ele conta como feito na sequência e o próximo treino passa a ser o seguinte. Dá para desfazer em Histórico."
          confirmLabel="Pular"
          onCancel={() => setConfirmSkip(false)}
          onConfirm={skipToday}
        />
      )}
    </div>
  )
}
