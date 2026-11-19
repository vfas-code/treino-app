import type { Exercise, Method, Plan, Workout } from './types'

let n = 0
const id = (p: string) => `${p}-${++n}`

const P = (name: string, notes: string): Exercise => ({
  id: id('ex'),
  name,
  sets: 4,
  reps: '12/10/8/6',
  method: 'piramide',
  rest: 90,
  notes,
})

const F = (name: string, notes: string, reps = '12–15', rest = 60, method: Method = 'fixa', sets = 3): Exercise => ({
  id: id('ex'),
  name,
  sets,
  reps,
  method,
  rest,
  notes,
})

const W = (key: string, name: string, focus: string, cardio: string, exercises: Exercise[]): Workout => ({
  id: `w-${key}`,
  name,
  focus,
  cardio,
  exercises,
})

/** Plano PPL ×2 montado em nov/2026 — foco em perda de gordura */
export function seedPlan(): Plan {
  n = 0
  const workouts: Workout[] = [
    W('a', 'A – Push (Peito)', 'Peito, ombro, tríceps', '3 km ritmo normal', [
      P('Supino reto (barra)', 'Escápulas encaixadas, desça a barra até o peito'),
      P('Supino inclinado com halteres', 'Banco a 30–45°, foco no peito superior'),
      F('Desenvolvimento com halteres', 'Sentado, sem travar o cotovelo em cima'),
      F('Elevação lateral', 'Carga leve, suba até a linha do ombro'),
      F('Tríceps corda (polia)', 'Abra a corda no final do movimento'),
      F('Tríceps francês (halter)', 'Cotovelos apontando para cima, sem abrir'),
    ]),
    W('b', 'B – Pull (Largura)', 'Costas, bíceps, antebraço', '3 km ritmo normal', [
      P('Puxada frontal', 'Puxe até o queixo, peito para frente'),
      P('Remada curvada (barra)', 'Coluna neutra, puxe em direção ao umbigo'),
      F('Remada baixa (triângulo)', 'Segure 1s com as costas contraídas'),
      F('Face pull (corda)', 'Puxe na altura do rosto, abrindo os cotovelos'),
      F('Rosca direta (barra)', 'Sem balançar o tronco'),
      F('Rosca martelo', 'Pegada neutra, trabalha antebraço'),
    ]),
    W('c', 'C – Legs (Quadríceps)', 'Quadríceps + core', '3 km leve ou caminhada inclinada', [
      P('Agachamento livre ou hack', 'Desça pelo menos até a coxa ficar paralela ao chão'),
      P('Leg press 45°', 'Não tire a lombar do banco'),
      F('Búlgaro ou afundo', 'Pode usar halteres', '12 cada perna'),
      F('Cadeira extensora', 'Segure 1s em cima'),
      F('Panturrilha em pé', 'Amplitude total, alongue bem embaixo', '15', 45),
      F('Prancha', 'Glúteo contraído, sem deixar o quadril cair', '45–60s', 45, 'tempo'),
    ]),
    W('d', 'D – Push (Ombro)', 'Ombro, peito superior, tríceps', '3 km com tiros (1 min forte / 2 min leve)', [
      P('Desenvolvimento militar (barra)', 'Em pé ou sentado, abdômen firme'),
      P('Supino inclinado (barra)', 'Banco a 30°'),
      F('Elevação lateral', 'Pode fazer na polia para variar'),
      F('Crucifixo inverso', 'Máquina ou halteres, deltoide posterior'),
      F('Tríceps testa', 'Barra W, cotovelos fechados'),
      F('Tríceps pulley (barra)', 'Cotovelos colados no corpo'),
    ]),
    W('e', 'E – Pull (Espessura)', 'Costas, trapézio, bíceps, antebraço', '3 km ritmo normal', [
      P('Barra fixa ou graviton', 'No graviton, diminua o contrapeso a cada série'),
      P('Remada cavalinho', 'Peito apoiado ou tronco firme'),
      F('Remada serrote (unilateral)', 'Puxe o cotovelo em direção ao quadril', '12 cada lado'),
      F('Pullover na polia', 'Braços quase estendidos'),
      F('Encolhimento com halteres', 'Segure 1s em cima, sem girar os ombros'),
      F('Rosca scott', 'Desça controlando o peso'),
      F('Rosca inversa ou de punho', 'Para o antebraço', '15', 45),
    ]),
    W('f', 'F – Legs (Posterior)', 'Posterior, glúteo + core', '3 km leve ou caminhada inclinada', [
      P('Stiff ou terra romeno', 'Quadril para trás, coluna sempre reta'),
      P('Hip thrust', 'Segure 1s em cima, apertando o glúteo'),
      F('Mesa flexora', 'Desça devagar'),
      F('Passada andando', 'Use halteres', '12 cada perna'),
      F('Panturrilha sentado', 'Amplitude total', '15', 45),
      F('Elevação de pernas', 'Deitado ou na barra, sem embalo', '12–15', 45),
      F('Pallof press', 'Na polia, resiste à rotação e trabalha a cintura', '12 cada lado', 45),
    ]),
  ]
  const now = Date.now()
  return {
    id: 'plan-ppl-x2',
    name: 'PPL ×2 – Perda de gordura',
    description:
      'Push/Pull/Legs duas vezes por semana. ⭐ = pirâmide 12/10/8/6 com 1:30; demais = 3×12–15 com 60s. Cardio de 3 km no final.',
    createdAt: now,
    updatedAt: now,
    workouts,
    schedule: { 0: undefined, 1: 'w-a', 2: 'w-b', 3: 'w-c', 4: 'w-d', 5: 'w-e', 6: 'w-f' },
  }
}
