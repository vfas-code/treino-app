import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Confirm } from '../components/Sheet'
import { db, setSetting } from '../db'
import { useActivePlanId } from '../hooks'
import { createPlan, deletePlan } from '../planOps'
import type { Plan } from '../types'

export default function Plans() {
  const plans = useLiveQuery(() => db.plans.orderBy('updatedAt').reverse().toArray(), [])
  const activeId = useActivePlanId()
  const navigate = useNavigate()
  const [toDelete, setToDelete] = useState<Plan | null>(null)

  const create = async (copy?: Plan) => {
    const p = await createPlan(copy ? `${copy.name} (cópia)` : 'Novo plano', copy)
    navigate(`/planos/${p.id}`)
  }

  return (
    <div className="page">
      <h1>Planos</h1>
      <p className="muted">Crie quantos planos quiser. O plano ativo é o que aparece na tela inicial.</p>

      <div className="list">
        {plans?.map((p) => (
          <div key={p.id} className={`card ${p.id === activeId ? 'card-active' : ''}`}>
            <Link to={`/planos/${p.id}`} className="row">
              <div className="grow">
                <div className="title">{p.name}</div>
                <div className="muted small">
                  {p.workouts.length} treinos · atualizado {new Date(p.updatedAt).toLocaleDateString('pt-BR')}
                </div>
              </div>
              {p.id === activeId && <div className="chip chip-accent">Ativo</div>}
            </Link>
            <div className="actions">
              {p.id !== activeId && (
                <button className="btn btn-sm" onClick={() => setSetting('activePlanId', p.id)}>
                  Ativar
                </button>
              )}
              <button className="btn btn-ghost btn-sm" onClick={() => create(p)}>
                Duplicar
              </button>
              <button className="btn btn-ghost btn-sm btn-danger" onClick={() => setToDelete(p)}>
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="btn btn-block" onClick={() => create()}>
        + Novo plano em branco
      </button>

      {toDelete && (
        <Confirm
          title={`Excluir "${toDelete.name}"?`}
          text="Os treinos do plano serão apagados. O histórico de cargas continua salvo."
          confirmLabel="Excluir"
          onCancel={() => setToDelete(null)}
          onConfirm={async () => {
            await deletePlan(toDelete.id)
            setToDelete(null)
          }}
        />
      )}
    </div>
  )
}
