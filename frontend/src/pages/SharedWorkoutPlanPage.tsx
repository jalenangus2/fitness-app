import { useParams } from 'react-router-dom'
import { Zap, Timer } from 'lucide-react'
import { useSharedWorkoutPlan } from '../hooks/useWorkout'
import Card from '../components/ui/Card'
import Spinner from '../components/ui/Spinner'

export default function SharedWorkoutPlanPage() {
  const { token } = useParams<{ token: string }>()
  const { data: plan, isLoading, isError } = useSharedWorkoutPlan(token ?? '')

  if (isLoading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  )

  if (isError || !plan) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-center px-4">
      <div>
        <p className="text-2xl text-slate-300 font-bold mb-2">Plan not found</p>
        <p className="text-slate-500 text-sm">This link may have expired or is invalid.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Shared Workout Plan</p>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center justify-center gap-2">
            {plan.name}
            {plan.is_ai_generated && <Zap size={20} className="text-yellow-400" />}
          </h1>
          <div className="flex items-center justify-center gap-2 flex-wrap mt-2">
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded capitalize">{plan.difficulty}</span>
            {plan.duration_mins && <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{plan.duration_mins} min</span>}
            {plan.muscle_groups.map(mg => (
              <span key={mg} className="text-xs text-slate-300 bg-slate-700 px-2 py-0.5 rounded capitalize">{mg}</span>
            ))}
          </div>
        </div>

        {/* Exercises */}
        <Card className="bg-slate-800 border-slate-700">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-4">Exercises</p>
          <div className="space-y-3">
            {plan.exercises.map((ex, i) => (
              <div key={ex.id ?? i} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-200">{ex.name}</p>
                  {ex.notes && <p className="text-xs text-slate-500 mt-0.5">{ex.notes}</p>}
                </div>
                <div className="text-right text-sm text-slate-400 shrink-0 ml-4">
                  {ex.duration_secs ? (
                    <span className="flex items-center gap-1"><Timer size={12} /> {ex.sets}×{ex.duration_secs}s</span>
                  ) : (
                    <span>{ex.sets}×{ex.reps ?? '—'}{ex.weight_lbs ? <span className="text-slate-600 ml-1">· {ex.weight_lbs}lbs</span> : null}</span>
                  )}
                </div>
              </div>
            ))}
            {plan.exercises.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No exercises in this plan.</p>
            )}
          </div>
        </Card>

        {plan.notes && (
          <Card className="bg-slate-800 border-slate-700">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Notes</p>
            <p className="text-sm text-slate-300">{plan.notes}</p>
          </Card>
        )}

        <p className="text-center text-xs text-slate-600 pt-4">Shared via LifeOS Fitness</p>
      </div>
    </div>
  )
}
