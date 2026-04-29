import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Dumbbell,
  UtensilsCrossed,
  ShoppingCart,
  Calendar,
  Shirt,
  DollarSign,
  LogOut,
  Zap,
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { useAuthStore } from '../../store/authStore'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/workout', icon: Dumbbell, label: 'Workout' },
  { to: '/meal', icon: UtensilsCrossed, label: 'Meal Plan' },
  { to: '/shopping', icon: ShoppingCart, label: 'Shopping' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/fashion', icon: Shirt, label: 'Fashion' },
  { to: '/finance', icon: DollarSign, label: 'Finances' },
]

export default function Sidebar() {
  const { user, logout } = useAuthStore()

  return (
    <aside className="hidden lg:flex w-64 flex-shrink-0 bg-slate-900 border-r border-slate-700/50 flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold text-slate-100">LifeOS</span>
        </div>
        {user && (
          <p className="text-xs text-slate-400 mt-2 truncate">@{user.username}</p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-700/50">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all w-full"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
