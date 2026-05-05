import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import NotificationBell from '../ui/NotificationBell'
import { useAuthStore } from '../../store/authStore'
import { Zap } from 'lucide-react'

export default function AppShell() {
  const token = useAuthStore((s) => s.token)

  if (!token) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 bg-slate-900 border-b border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap size={15} className="text-white" />
            </div>
            <span className="text-lg font-bold text-slate-100">LifeOS</span>
          </div>
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
