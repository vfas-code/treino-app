import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

export function useActivePlanId() {
  return useLiveQuery(async () => {
    const s = await db.settings.get('activePlanId')
    return (s?.value as string | null | undefined) ?? null
  }, [])
}

export function useActivePlan() {
  const id = useActivePlanId()
  const plan = useLiveQuery(async () => (id ? await db.plans.get(id) : null), [id])
  return { loading: id === undefined || plan === undefined, plan: plan ?? null }
}

export function usePlan(planId?: string) {
  return useLiveQuery(async () => (planId ? (await db.plans.get(planId)) ?? null : null), [planId])
}

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export type ScheduleMode = 'agenda' | 'sequencia'

/** 'agenda' = treino fixo por dia da semana; 'sequencia' = próximo treino da fila */
export function useScheduleMode(): ScheduleMode | undefined {
  return useLiveQuery(async () => {
    const s = await db.settings.get('scheduleMode')
    return s?.value === 'sequencia' ? 'sequencia' : 'agenda'
  }, [])
}
