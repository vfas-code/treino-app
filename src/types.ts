export type Method = 'piramide' | 'fixa' | 'tempo' | 'livre'

export interface Exercise {
  id: string
  name: string
  sets: number
  /** Texto livre de repetições, ex.: "12/10/8/6", "12–15", "45–60s" */
  reps: string
  method: Method
  /** Descanso em segundos */
  rest: number
  notes?: string
  /** Link do YouTube (ou qualquer URL de vídeo) */
  videoUrl?: string
  /** Vídeo próprio salvo no aparelho (tabela videos) */
  videoId?: string
}

export interface Workout {
  id: string
  name: string
  focus?: string
  cardio?: string
  exercises: Exercise[]
}

export interface Plan {
  id: string
  name: string
  description?: string
  createdAt: number
  updatedAt: number
  workouts: Workout[]
  /** Índice 0 = domingo … 6 = sábado → id do treino (ou vazio = descanso) */
  schedule: Record<number, string | undefined>
}

export interface SetLog {
  id?: number
  sessionId: string
  exerciseId: string
  exerciseName: string
  setIndex: number
  weight: number
  reps: number
  ts: number
}

export interface Session {
  id: string
  planId: string
  workoutId: string
  workoutName: string
  /** AAAA-MM-DD */
  date: string
  startedAt: number
  finishedAt?: number
}

export interface StoredVideo {
  id: string
  name: string
  type: string
  blob: Blob
  createdAt: number
}

export interface Setting {
  key: string
  value: unknown
}

export const METHOD_LABEL: Record<Method, string> = {
  piramide: '⭐ Pirâmide',
  fixa: 'Fixa',
  tempo: 'Tempo',
  livre: 'Livre',
}
