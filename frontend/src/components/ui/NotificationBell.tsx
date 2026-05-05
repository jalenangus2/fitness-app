import { useState, useRef, useEffect } from 'react'
import { Bell, X, CheckCheck, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useNotifications, useMarkRead, useMarkAllRead, useDeleteNotification } from '../../hooks/useNotifications'

const TYPE_COLORS: Record<string, string> = {
  reminder: 'bg-indigo-500',
  alert: 'bg-red-500',
  info: 'bg-slate-500',
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data: notifications = [] } = useNotifications()
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()
  const del = useDeleteNotification()

  const unread = notifications.filter(n => !n.read).length

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    setOpen(o => !o)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1rem)] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-slate-100">Notifications</h3>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={() => markAll.mutate()}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-2 py-1"
                  title="Mark all read"
                >
                  <CheckCheck size={13} /> All read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 p-1">
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-700/50">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell size={24} className="mx-auto text-slate-600 mb-2" />
                <p className="text-sm text-slate-500">No notifications</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 hover:bg-slate-750 cursor-pointer transition-colors ${!n.read ? 'bg-slate-800/80' : 'opacity-60'}`}
                  onClick={() => { if (!n.read) markRead.mutate(n.id) }}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${TYPE_COLORS[n.type] ?? 'bg-slate-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 leading-snug">{n.title}</p>
                    {n.body && <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>}
                    <p className="text-[10px] text-slate-600 mt-1">
                      {format(parseISO(n.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); del.mutate(n.id) }}
                    className="text-slate-600 hover:text-red-400 flex-shrink-0 p-1"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
