import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dumbbell, UtensilsCrossed, ShoppingCart, Calendar, CheckSquare, Shirt, Sun, CloudSun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, MapPin, Pencil, Check, X } from 'lucide-react'
import { useDashboard, useWeather, useDailyVerse } from '../hooks/useDashboard'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import { formatDate, daysUntil } from '../utils/date'
import { useAuthStore } from '../store/authStore'
import { updateMe } from '../api/auth'

function weatherIcon(code: number) {
  if (code === 0) return <Sun size={36} className="text-yellow-400" />
  if (code <= 2) return <CloudSun size={36} className="text-yellow-300" />
  if (code === 3) return <Cloud size={36} className="text-slate-400" />
  if (code <= 48) return <Wind size={36} className="text-slate-400" />
  if (code <= 67) return <CloudRain size={36} className="text-blue-400" />
  if (code <= 77) return <CloudSnow size={36} className="text-sky-300" />
  if (code <= 82) return <CloudRain size={36} className="text-blue-500" />
  if (code <= 86) return <CloudSnow size={36} className="text-sky-400" />
  return <CloudLightning size={36} className="text-yellow-500" />
}

function WeatherCard() {
  const { data, isLoading, isError } = useWeather()

  if (isLoading) return (
    <Card className="flex items-center gap-3 py-4">
      <Spinner size="sm" />
      <span className="text-slate-400 text-sm">Loading weather…</span>
    </Card>
  )

  if (isError || !data) return (
    <Card className="flex items-center gap-3 py-3">
      <Cloud size={24} className="text-slate-600 flex-shrink-0" />
      <div>
        <p className="text-sm text-slate-400">Weather unavailable</p>
        <p className="text-xs text-slate-500 flex items-center gap-1"><MapPin size={10} />Greensboro, NC</p>
      </div>
    </Card>
  )

  return (
    <Card className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        {weatherIcon(data.weather_code)}
        <div>
          <p className="text-3xl font-bold text-slate-100">{Math.round(data.current_temp_f)}°F</p>
          <p className="text-slate-400 text-sm">{data.condition}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-slate-300 text-sm font-medium">
          H:{Math.round(data.temp_high_f)}° / L:{Math.round(data.temp_low_f)}°
        </p>
        <p className="text-slate-500 text-xs flex items-center justify-end gap-1 mt-0.5">
          <MapPin size={10} />{data.location}
        </p>
      </div>
    </Card>
  )
}

function NutritionRing({ value, target, color, label, unit }: { value: number; target: number | null; color: string; label: string; unit: string }) {
  const size = 72, stroke = 7, r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = target ? Math.min(value / target, 1) : 0
  const filled = circ * pct
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="block">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${filled} ${circ}`} strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dasharray 0.5s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-slate-100 leading-none">{Math.round(value)}</span>
          <span className="text-[9px] text-slate-500 leading-none mt-0.5">{unit}</span>
        </div>
      </div>
      <span className="text-[10px] text-slate-400 font-medium">{label}</span>
      {target && <span className="text-[9px] text-slate-600">/ {target}{unit}</span>}
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboard()
  const { data: verse } = useDailyVerse()
  const { user, updateUser } = useAuthStore()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setDraft(user?.display_name ?? '')
      inputRef.current?.focus()
    }
  }, [editing])

  const saveDisplayName = async () => {
    const trimmed = draft.trim()
    try {
      const updated = await updateMe({ display_name: trimmed || null })
      updateUser({ display_name: updated.display_name })
    } catch {}
    setEditing(false)
  }

  const displayName = user?.display_name || user?.username

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  )

  return (
    <div className="space-y-5 pb-2">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2 flex-wrap">
          Good {getGreeting()},{' '}
          {editing ? (
            <span className="flex items-center gap-1">
              <input
                ref={inputRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveDisplayName(); if (e.key === 'Escape') setEditing(false) }}
                className="bg-slate-700 border border-indigo-500 rounded-lg px-2 py-0.5 text-xl font-bold text-slate-100 focus:outline-none w-40"
                placeholder={user?.username}
              />
              <button onClick={saveDisplayName} className="text-emerald-400 hover:text-emerald-300 p-1"><Check size={18} /></button>
              <button onClick={() => setEditing(false)} className="text-slate-500 hover:text-slate-300 p-1"><X size={18} /></button>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              {displayName} 👋
              <button onClick={() => setEditing(true)} className="text-slate-500 hover:text-slate-300 transition-colors" title="Edit display name">
                <Pencil size={14} />
              </button>
            </span>
          )}
        </h1>
        <p className="text-slate-400 mt-1">Here's your life at a glance.</p>
      </div>

      <WeatherCard />

      {/* Daily Bible Verse */}
      {verse && (
        <Card className="bg-gradient-to-br from-indigo-900/40 to-slate-800 border-indigo-700/30">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✝</span>
            <div>
              <p className="text-sm text-slate-300 italic leading-relaxed">"{verse.text}"</p>
              <p className="text-xs text-indigo-400 font-medium mt-2">— {verse.reference}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Dumbbell size={20} className="text-indigo-400" />} label="Active Workout" value={data?.active_workout_plan?.name ?? 'None set'} sub={data?.active_workout_plan ? `${data.active_workout_plan.exercise_count} exercises` : 'Go to Workout'} onClick={() => navigate('/workout')} />
        {/* Nutrition calorie card */}
        <Card className="cursor-pointer hover:border-slate-600 transition-all" onClick={() => navigate('/meal')}>
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-slate-700 rounded-lg"><UtensilsCrossed size={20} className="text-green-400" /></div>
          </div>
          <p className="text-xs text-slate-400 mb-1">Today's Calories</p>
          <p className="text-lg font-semibold text-slate-100">
            {data?.nutrition_log_today?.calories ?? 0}
            {data?.nutrition_target_calories && <span className="text-xs text-slate-500 font-normal ml-1">/ {data.nutrition_target_calories}</span>}
          </p>
          <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${Math.min(((data?.nutrition_log_today?.calories ?? 0) / (data?.nutrition_target_calories ?? 2000)) * 100, 100)}%` }} />
          </div>
        </Card>
        <StatCard icon={<ShoppingCart size={20} className="text-yellow-400" />} label="Shopping Lists" value={String(data?.shopping_list_count ?? 0)} sub="active lists" onClick={() => navigate('/shopping')} />
        <StatCard icon={<CheckSquare size={20} className="text-red-400" />} label="Open Tasks" value={String(data?.today_tasks?.length ?? 0)} sub="incomplete" onClick={() => navigate('/schedule')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Nutrition — always visible */}
        <Card className="cursor-pointer" onClick={() => navigate('/meal')}>
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <UtensilsCrossed size={16} className="text-green-400" />
            Today's Nutrition
          </h2>
          <div className="grid grid-cols-4 gap-2 justify-items-center">
            <NutritionRing label="Calories" value={data?.nutrition_log_today?.calories ?? 0} target={data?.nutrition_target_calories ?? null} unit="kcal" color="#10b981" />
            <NutritionRing label="Protein" value={data?.nutrition_log_today?.protein_g ?? 0} target={data?.nutrition_target_protein_g ?? null} unit="g" color="#3b82f6" />
            <NutritionRing label="Carbs" value={data?.nutrition_log_today?.carbs_g ?? 0} target={data?.nutrition_target_carbs_g ?? null} unit="g" color="#f59e0b" />
            <NutritionRing label="Fat" value={data?.nutrition_log_today?.fat_g ?? 0} target={data?.nutrition_target_fat_g ?? null} unit="g" color="#f43f5e" />
          </div>
          {!data?.nutrition_log_today && (
            <p className="text-xs text-slate-500 text-center mt-3">No food logged today — tap to add</p>
          )}
        </Card>

        {/* Upcoming Events */}
        <Card>
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-indigo-400" />
            Upcoming Events
          </h2>
          {data?.upcoming_events && data.upcoming_events.length > 0 ? (
            <div className="space-y-3">
              {data.upcoming_events.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ev.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{ev.title}</p>
                    <p className="text-xs text-slate-400">{formatDate(ev.start_datetime)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No upcoming events in the next 7 days.</p>
          )}
        </Card>

        {/* Tasks */}
        <Card>
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <CheckSquare size={16} className="text-red-400" />
            Open Tasks
          </h2>
          {data?.today_tasks && data.today_tasks.length > 0 ? (
            <div className="space-y-2">
              {data.today_tasks.map((task) => {
                const overdue = task.due_date && new Date(task.due_date) < new Date(new Date().toDateString())
                return (
                  <div key={task.id} className="flex items-center gap-3 text-sm">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-yellow-400' : 'bg-slate-500'
                    }`} />
                    <span className="text-slate-300 flex-1 truncate">{task.title}</span>
                    {task.due_date
                      ? <span className={`text-xs ${overdue ? 'text-red-400 font-medium' : 'text-slate-500'}`}>{overdue ? 'Overdue' : formatDate(task.due_date)}</span>
                      : <span className="text-xs text-slate-600">No date</span>
                    }
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">All caught up! No open tasks.</p>
          )}
        </Card>

        {/* Fashion Releases */}
        <Card>
          <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Shirt size={16} className="text-yellow-400" />
            Upcoming Releases
          </h2>
          {data?.upcoming_fashion_releases && data.upcoming_fashion_releases.length > 0 ? (
            <div className="space-y-3">
              {data.upcoming_fashion_releases.slice(0, 4).map((r) => {
                const days = daysUntil(r.release_date)
                return (
                  <div key={r.id} className="flex items-center gap-3">
                    {r.image_url ? (
                      <img src={r.image_url} alt={r.name} className="w-10 h-10 rounded-lg object-cover bg-slate-700" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                        <Shirt size={16} className="text-slate-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 truncate">{r.brand} — {r.name}</p>
                      <p className="text-xs text-slate-400">{formatDate(r.release_date)}</p>
                    </div>
                    <Badge variant={days <= 1 ? 'red' : days <= 7 ? 'yellow' : 'slate'}>
                      {days === 0 ? 'Today' : days < 0 ? 'Released' : `${days}d`}
                    </Badge>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No releases in the next 30 days.</p>
          )}
        </Card>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, onClick }: { icon: React.ReactNode; label: string; value: string; sub: string; onClick?: () => void }) {
  return (
    <Card className="cursor-pointer hover:border-slate-600 transition-all" onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 bg-slate-700 rounded-lg">{icon}</div>
      </div>
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-lg font-semibold text-slate-100 truncate">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5 capitalize">{sub}</p>
    </Card>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
