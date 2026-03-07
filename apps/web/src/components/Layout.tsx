import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, RefreshCw, ClipboardList, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useLogout } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/cycles', label: 'Ciclos', icon: RefreshCw },
  { to: '/templates', label: 'Templates', icon: FileText },
  { to: '/assignments', label: 'Minhas Tarefas', icon: ClipboardList },
]

export function Layout(): JSX.Element {
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-lg font-bold text-primary">Reviews 360</h1>
          {user && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{user.name}</p>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
