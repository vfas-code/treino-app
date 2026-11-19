import { useState } from 'react'
import { Confirm } from '../components/Sheet'
import { db, exportBackup, importBackup, setSetting, today } from '../db'
import { useScheduleMode } from '../hooks'
import { seedPlan } from '../seed'

export default function Settings() {
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmSeed, setConfirmSeed] = useState(false)
  const mode = useScheduleMode()

  const doExport = async () => {
    const data = await exportBackup()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const file = new File([blob], `treino-backup-${today()}.json`, { type: 'application/json' })
    // No iPhone o menu de compartilhar é o jeito mais fácil de salvar no app Arquivos/iCloud
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Backup do treino' })
        return setMsg('Backup compartilhado.')
      } catch {
        /* usuário cancelou: cai no download */
      }
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
    setMsg('Backup baixado.')
  }

  const doImport = async (file?: File) => {
    if (!file) return
    try {
      await importBackup(JSON.parse(await file.text()))
      setMsg('Backup restaurado com sucesso.')
    } catch (e) {
      setMsg(`Erro ao importar: ${(e as Error).message}`)
    }
  }

  return (
    <div className="page">
      <h1>Ajustes</h1>

      <h2>Qual treino aparece hoje</h2>
      <div className="card">
        <div className="tabs">
          <button className={mode === 'agenda' ? 'active' : ''} onClick={() => setSetting('scheduleMode', 'agenda')}>
            Agenda por dia
          </button>
          <button className={mode === 'sequencia' ? 'active' : ''} onClick={() => setSetting('scheduleMode', 'sequencia')}>
            Sequência
          </button>
        </div>
        <p className="muted small">
          {mode === 'sequencia'
            ? 'O app sugere o treino seguinte ao último que você fez ou pulou (A → B → C → A…). Se faltar, o treino da vez continua na fila; use "Pular" na tela inicial para avançar.'
            : 'O treino de hoje segue a agenda da semana definida no plano (ex.: segunda = A).'}
        </p>
      </div>

      <h2>Backup</h2>
      <div className="card">
        <p className="muted small">
          Seus dados ficam salvos só neste aparelho. Faça backup de vez em quando, principalmente antes de trocar de
          celular. Vídeos próprios não entram no backup.
        </p>
        <div className="actions">
          <button className="btn" onClick={doExport}>
            ⬇ Exportar backup
          </button>
          <label className="btn btn-ghost">
            ⬆ Importar backup
            <input type="file" accept="application/json,.json" hidden onChange={(e) => doImport(e.target.files?.[0])} />
          </label>
        </div>
        {msg && <p className="small">{msg}</p>}
      </div>

      <h2>Instalar no iPhone</h2>
      <div className="card">
        <ol className="small steps">
          <li>Abra o endereço do app no <b>Safari</b>.</li>
          <li>
            Toque no botão <b>Compartilhar</b> (quadrado com seta).
          </li>
          <li>
            Escolha <b>Adicionar à Tela de Início</b>.
          </li>
          <li>Abra pelo ícone: o app roda em tela cheia e funciona offline.</li>
        </ol>
      </div>

      <h2>Plano padrão</h2>
      <div className="card">
        <p className="muted small">Adiciona de novo o plano PPL ×2 original como um plano novo, sem apagar nada.</p>
        <button className="btn btn-ghost" onClick={() => setConfirmSeed(true)}>
          Restaurar plano PPL ×2
        </button>
      </div>

      <p className="muted small center">Treino App · v{__APP_VERSION__}</p>

      {confirmSeed && (
        <Confirm
          title="Adicionar o plano PPL ×2?"
          confirmLabel="Adicionar"
          onCancel={() => setConfirmSeed(false)}
          onConfirm={async () => {
            const p = seedPlan()
            p.id = `plan-ppl-x2-${Date.now()}`
            await db.plans.add(p)
            await setSetting('activePlanId', p.id)
            setConfirmSeed(false)
            setMsg('Plano PPL ×2 adicionado e ativado.')
          }}
        />
      )}
    </div>
  )
}
