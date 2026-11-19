import Dexie, { type EntityTable } from 'dexie'
import type { Measure, Plan, Session, SetLog, Setting, StoredVideo } from './types'
import { seedPlan } from './seed'

export const db = new Dexie('treino-app') as Dexie & {
  plans: EntityTable<Plan, 'id'>
  sessions: EntityTable<Session, 'id'>
  logs: EntityTable<SetLog, 'id'>
  videos: EntityTable<StoredVideo, 'id'>
  settings: EntityTable<Setting, 'key'>
  measures: EntityTable<Measure, 'id'>
}

db.version(1).stores({
  plans: 'id, name, updatedAt',
  sessions: 'id, planId, workoutId, date, startedAt',
  logs: '++id, sessionId, exerciseId, exerciseName, ts',
  videos: 'id, createdAt',
  settings: 'key',
})

// v2: medidas corporais (peso, cintura, % de gordura)
db.version(2).stores({
  measures: 'id, date',
})

db.on('populate', async (tx) => {
  const plan = seedPlan()
  await tx.table('plans').add(plan)
  await tx.table('settings').add({ key: 'activePlanId', value: plan.id })
})

export const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`)

export const today = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const s = await db.settings.get(key)
  return (s?.value as T) ?? fallback
}

export async function setSetting(key: string, value: unknown) {
  await db.settings.put({ key, value })
}

/** Últimos registros de um exercício, excluindo a sessão atual */
export async function lastLogsFor(exerciseId: string, exerciseName: string, excludeSession?: string) {
  const byId = await db.logs.where('exerciseId').equals(exerciseId).reverse().sortBy('ts')
  const pool = byId.length
    ? byId
    : await db.logs.where('exerciseName').equals(exerciseName).reverse().sortBy('ts')
  const prev = pool.filter((l) => l.sessionId !== excludeSession)
  if (!prev.length) return []
  const sid = prev[0].sessionId
  return prev.filter((l) => l.sessionId === sid).sort((a, b) => a.setIndex - b.setIndex)
}

/** Maior carga já registrada num exercício, ignorando a sessão atual */
export async function bestWeightFor(exerciseId: string, exerciseName: string, excludeSession?: string) {
  let pool = await db.logs.where('exerciseId').equals(exerciseId).toArray()
  if (!pool.length) pool = await db.logs.where('exerciseName').equals(exerciseName).toArray()
  return pool.filter((l) => l.sessionId !== excludeSession).reduce((m, l) => Math.max(m, l.weight), 0)
}

/** Backup completo (sem os vídeos próprios, que ficam só no aparelho) */
export async function exportBackup() {
  return {
    app: 'treino-app',
    version: 1,
    exportedAt: new Date().toISOString(),
    plans: await db.plans.toArray(),
    sessions: await db.sessions.toArray(),
    logs: await db.logs.toArray(),
    settings: await db.settings.toArray(),
    measures: await db.measures.toArray(),
  }
}

export async function importBackup(
  data: Omit<Awaited<ReturnType<typeof exportBackup>>, 'measures'> & { measures?: Measure[] },
) {
  if (data?.app !== 'treino-app') throw new Error('Arquivo não é um backup deste app')
  await db.transaction('rw', [db.plans, db.sessions, db.logs, db.settings, db.measures], async () => {
    await Promise.all([
      db.plans.clear(),
      db.sessions.clear(),
      db.logs.clear(),
      db.settings.clear(),
      db.measures.clear(),
    ])
    await db.plans.bulkAdd(data.plans)
    await db.sessions.bulkAdd(data.sessions)
    await db.logs.bulkAdd(data.logs)
    await db.settings.bulkAdd(data.settings)
    // Backups antigos (v1) não têm medidas
    await db.measures.bulkAdd(data.measures ?? [])
  })
}
