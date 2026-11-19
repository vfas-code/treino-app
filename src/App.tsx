import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { RestTimerProvider } from './components/RestTimer'
import History from './pages/History'
import Home from './pages/Home'
import PlanEditor from './pages/PlanEditor'
import Plans from './pages/Plans'
import Settings from './pages/Settings'
import WorkoutEditor from './pages/WorkoutEditor'
import WorkoutSession from './pages/WorkoutSession'

const NAV = [
  { to: '/', label: 'Treino', icon: '🏋️', end: true },
  { to: '/planos', label: 'Planos', icon: '📋' },
  { to: '/historico', label: 'Histórico', icon: '📈' },
  { to: '/config', label: 'Ajustes', icon: '⚙️' },
]

export default function App() {
  return (
    <HashRouter>
      <RestTimerProvider>
        <main className="app">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/treino/:workoutId" element={<WorkoutSession />} />
            <Route path="/planos" element={<Plans />} />
            <Route path="/planos/:planId" element={<PlanEditor />} />
            <Route path="/planos/:planId/:workoutId" element={<WorkoutEditor />} />
            <Route path="/historico" element={<History />} />
            <Route path="/config" element={<Settings />} />
          </Routes>
        </main>
        <nav className="tabbar">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="tab-icon">{n.icon}</span>
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
      </RestTimerProvider>
    </HashRouter>
  )
}
