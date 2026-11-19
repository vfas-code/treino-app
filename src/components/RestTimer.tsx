import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

interface TimerCtx {
  start: (seconds: number, label?: string) => void
}

const Ctx = createContext<TimerCtx>({ start: () => {} })
export const useRestTimer = () => useContext(Ctx)

// O iOS só libera áudio depois de um toque do usuário: o contexto é criado
// dentro do clique que inicia o descanso e reaproveitado no bip final.
let audio: AudioContext | null = null
function unlockAudio() {
  try {
    if (!audio) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      audio = new AC()
    }
    if (audio.state === 'suspended') void audio.resume()
  } catch {
    audio = null
  }
}

function beep() {
  try {
    if (audio) {
      const ctx = audio
      ;[0, 0.25, 0.5].forEach((t) => {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.frequency.value = 880
        g.gain.setValueAtTime(0.25, ctx.currentTime + t)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2)
        o.connect(g).connect(ctx.destination)
        o.start(ctx.currentTime + t)
        o.stop(ctx.currentTime + t + 0.2)
      })
    }
    navigator.vibrate?.([200, 100, 200])
  } catch {
    /* sem áudio */
  }
}

export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [endAt, setEndAt] = useState<number | null>(null)
  const [total, setTotal] = useState(0)
  const [label, setLabel] = useState('')
  const [now, setNow] = useState(Date.now())
  const fired = useRef(false)

  const start = useCallback((seconds: number, l = '') => {
    unlockAudio()
    fired.current = false
    setTotal(seconds)
    setLabel(l)
    setNow(Date.now())
    setEndAt(Date.now() + seconds * 1000)
  }, [])

  useEffect(() => {
    if (!endAt) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [endAt])

  const left = endAt ? Math.ceil((endAt - now) / 1000) : 0

  useEffect(() => {
    if (endAt && left <= 0 && !fired.current) {
      fired.current = true
      beep()
    }
  }, [endAt, left])

  return (
    <Ctx.Provider value={{ start }}>
      {children}
      {endAt && (
        <div className={`timer ${left <= 0 ? 'timer-done' : ''}`}>
          <div className="timer-bar" style={{ width: `${Math.max(0, Math.min(100, (left / total) * 100))}%` }} />
          <div className="timer-body">
            <div>
              <div className="timer-label">{left <= 0 ? 'Bora, próxima série!' : `Descanso ${label}`}</div>
              <div className="timer-time">{left <= 0 ? '0:00' : fmt(left)}</div>
            </div>
            <div className="timer-actions">
              <button className="btn btn-ghost" onClick={() => setEndAt((e) => (e ?? Date.now()) + 15000)}>
                +15s
              </button>
              <button className="btn" onClick={() => setEndAt(null)}>
                {left <= 0 ? 'OK' : 'Pular'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}
