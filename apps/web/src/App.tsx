import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth.store'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/Login'
import { DashboardPage } from './pages/Dashboard'
import { TemplatesPage } from './pages/Templates'
import { CyclesPage } from './pages/Cycles'
import { AssignmentsPage } from './pages/Assignments'

function PrivateRoute({ children }: { children: React.ReactNode }): JSX.Element {
  const token = useAuthStore((s) => s.accessToken)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="cycles" element={<CyclesPage />} />
          <Route path="assignments" element={<AssignmentsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
