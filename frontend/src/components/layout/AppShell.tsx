import { Outlet, Navigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { useAuthStore } from '../../store/authStore'

export default function AppShell() {
  const token = useAuthStore((s) => s.token)

  if (!token) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen bg-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
