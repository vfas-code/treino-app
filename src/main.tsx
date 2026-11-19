import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'

// Atualiza o app sozinho quando sair uma versão nova
registerSW({ immediate: true })

// Pede ao navegador para não apagar os dados do app quando faltar espaço
void navigator.storage?.persist?.()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
