import { Dumbbell, UtensilsCrossed, ShoppingCart, Calendar, CheckSquare, Shirt, Sun, CloudSun, Cloud, CloudRain, CloudSnow, CloudLightning, Wind, MapPin } from 'lucide-react'
import { useDashboard, useWeather } from '../hooks/useDashboard'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'
import { formatDate, daysUntil } from '../utils/date'
import { useAuthStore } from '../store/authStore'

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

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number | null; color: string }) {
  const pct = target ? Math.min((value / target) * 100, 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{label}</span>
        <span>{Math.round(value)}g {target ? `/ ${target}g` : ''}</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboard()
  const user = useAuthStore((s) => s.user)

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  )

  return (
    <div className="space-y-5 pb-2">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">
          Good {getGreeting()}, {user?.username} 👋
        </h1>
        <p className="text-slate-400 mt-1">Here's your life at a glance.</p>
      </div>

      <WeatherCard />

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Dumbbell size={20} className="text-indigo-400" />} label="Active Workout" value={data?.active_workout_plan?.name ?? 'None set'} sub={data?.active_workout_plan ? `${data.active_workout_plan.exercise_count} exercises` : 'Go to Workout'} />
        <StatCard icon={<UtensilsCrossed size={20} className="text-green-400" />} label="Meal Plan" value={data?.active_meal_plan?.name ?? 'None set'} sub={data?.active_meal_plan?.goal?.replace('_', ' ') ?? 'Go to Meal Plan'} />
        <StatCard icon={<ShoppingCart size={20} className="text-yellow-400" />} label="Shopping Lists" value={String(data?.shopping_list_count ?? 0)} sub="active lists" />
        <StatCard icon={<CheckSquare size={20} className="text-red-400" />} label="Open Tasks" value={String(data?.today_tasks?.length ?? 0)} sub="incomplete" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Macros */}
        {data?.active_meal_plan && (
          <Card>
            <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <UtensilsCrossed size={16} className="text-green-400" />
              Today's Nutrition
            </h2>
            {data.macro_today ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-2xl font-bold text-slate-100">{data.macro_today.calories}</span>
                  <span className="text-slate-400 text-sm">
                    / {data.active_meal_plan.target_calories ?? '—'} kcal
                  </span>
                </div>
                <MacroBar label="Protein" value={data.macro_today.protein_g} target={data.active_meal_plan.target_protein_g} color="bg-blue-500" />
                <MacroBar label="Carbs" value={data.macro_today.carbs_g} target={data.active_meal_plan.target_carbs_g} color="bg-yellow-500" />
                <MacroBar label="Fat" value={data.macro_today.fat_g} target={data.active_meal_plan.target_fat_g} color="bg-red-500" />
                <div className="mt-4 space-y-2">
                  {data.active_meal_plan.today_meals.map((m, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-slate-300 capitalize">{m.meal_type}: {m.name}</span>
                      <span className="text-slate-400">{m.calories} kcal</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">No meals logged for today.</p>
            )}
          </Card>
        )}

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

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <Card>
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
