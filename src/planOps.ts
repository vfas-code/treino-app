import { db, getSetting, setSetting, uid } from './db'
import type { Exercise, Plan, Workout } from './types'

export async function updatePlan(planId: string, mutate: (p: Plan) => void) {
  await db.transaction('rw', db.plans, async () => {
    const plan = await db.plans.get(planId)
    if (!plan) return
    mutate(plan)
    plan.updatedAt = Date.now()
    await db.plans.put(plan)
  })
}

export async function updateWorkout(planId: string, workoutId: string, mutate: (w: Workout) => void) {
  await updatePlan(planId, (p) => {
    const w = p.workouts.find((x) => x.id === workoutId)
    if (w) mutate(w)
  })
}

export function move<T>(arr: T[], from: number, to: number) {
  if (to < 0 || to >= arr.length) return
  const [item] = arr.splice(from, 1)
  arr.splice(to, 0, item)
}

export const newExercise = (): Exercise => ({
  id: uid(),
  name: 'Novo exercício',
  sets: 3,
  reps: '12–15',
  method: 'fixa',
  rest: 60,
})

export const newWorkout = (index: number): Workout => ({
  id: uid(),
  name: `Treino ${String.fromCharCode(65 + index)}`,
  exercises: [],
})

export async function createPlan(name: string, copyFrom?: Plan) {
  const now = Date.now()
  const plan: Plan = copyFrom
    ? {
        ...structuredClone(copyFrom),
        id: uid(),
        name,
        createdAt: now,
        updatedAt: now,
      }
    : { id: uid(), name, createdAt: now, updatedAt: now, workouts: [], schedule: {} }

  if (copyFrom) {
    // Novos ids para treinos e exercícios, mantendo a agenda apontando certo
    const map = new Map<string, string>()
    plan.workouts.forEach((w) => {
      const nid = uid()
      map.set(w.id, nid)
      w.id = nid
      w.exercises.forEach((e) => (e.id = uid()))
    })
    plan.schedule = Object.fromEntries(
      Object.entries(plan.schedule).map(([d, wid]) => [d, wid ? map.get(wid) : undefined]),
    )
  }
  await db.plans.add(plan)
  return plan
}

export async function deletePlan(planId: string) {
  await db.plans.delete(planId)
  const active = await getSetting<string | null>('activePlanId', null)
  if (active === planId) {
    const first = await db.plans.orderBy('updatedAt').last()
    await setSetting('activePlanId', first?.id ?? null)
  }
}

export async function saveVideoFile(file: File) {
  const id = uid()
  await db.videos.add({ id, name: file.name, type: file.type, blob: file, createdAt: Date.now() })
  return id
}
