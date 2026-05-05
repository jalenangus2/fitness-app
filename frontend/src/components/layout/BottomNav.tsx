import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Dumbbell, UtensilsCrossed, Calendar,
  DollarSign, ShoppingCart, Shirt, MoreHorizontal, X,
} from 'lucide-react'
import { cn } from '../../utils/cn'

const PRIMARY = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/workout', icon: Dumbbell, label: 'Workout' },
  { to: '/meal', icon: UtensilsCrossed, label: 'Nutrition' },
  { to: '/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/fashion', icon: Shirt, label: 'Fashion' },
]

const MORE = [
  { to: '/shopping', icon: ShoppingCart, label: 'Shopping' },
  { to: '/finance', icon: DollarSign, label: 'Finance' },
]

export default function BottomNav() {
  const [showMore, setShowMore] = useState(false)
  const location = useLocation()
  const isMoreActive = MORE.some(item => location.pathname.startsWith(item.to))

  return (
    <>
      {/* More drawer */}
      {showMore && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute bottom-16 left-0 right-0 bg-slate-800 border-t border-slate-700 rounded-t-2xl p-4 pb-2">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">More</p>
              <button onClick={() => setShowMore(false)} className="text-slate-400 p-1">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {MORE.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setShowMore(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium',
                      isActive
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700 text-slate-300'
                    )
                  }
                >
                  <Icon size={20} />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-slate-900 border-t border-slate-700/60 safe-area-bottom">
        <div className="flex items-stretch h-16">
          {PRIMARY.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                  isActive ? 'text-indigo-400' : 'text-slate-500'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.75} />
                  {label}
                </>
              )}
            </NavLink>
          ))}

          {/* More button */}
          <button
            onClick={() => setShowMore(s => !s)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
              isMoreActive || showMore ? 'text-indigo-400' : 'text-slate-500'
            )}
          >
            <MoreHorizontal size={22} strokeWidth={isMoreActive || showMore ? 2.5 : 1.75} />
            More
          </button>
        </div>
      </nav>
    </>
  )
}
