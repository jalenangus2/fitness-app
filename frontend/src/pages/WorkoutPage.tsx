import { useState } from 'react'
import { Plus, Zap, CheckCircle, Trash2, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react'
import { useWorkouts, useGenerateWorkout, useActivateWorkout, useDeleteWorkout } from '../hooks/useWorkout'
import { useToast } from '../components/ui/Toast'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Select from '../components/ui/Select'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'
import type { WorkoutPlan } from '../types'

const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Forearms', 'Legs', 'Quads', 'Hamstrings', 'Glutes',
  'Calves', 'Core', 'Full Body',
]

const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]

export default function WorkoutPage() {
  const { data: plans = [], isLoading } = useWorkouts()
  const generate = useGenerateWorkout()
  const activate = useActivateWorkout()
  const remove = useDeleteWorkout()
  const { toast } = useToast()
  const [showModal, setShowModal] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [form, setForm] = useState({
    muscle_groups: [] as string[],
    difficulty: 'intermediate',
    duration_mins: 45,
    notes: '',
  })

  const toggleMuscle = (m: string) => {
    setForm((f) => ({
      ...f,
      muscle_groups: f.muscle_groups.includes(m)
        ? f.muscle_groups.filter((x) => x !== m)
        : [...f.muscle_groups, m],
    }))
  }

  const handleGenerate = async () => {
    if (form.muscle_groups.length === 0) {
      toast('Select at least one muscle group.', 'error')
      return
    }
    try {
      await generate.mutateAsync({ ...form, muscle_groups: form.muscle_groups.map((m) => m.toLowerCase()) })
      toast('Workout plan generated!', 'success')
      setShowModal(false)
      setForm({ muscle_groups: [], difficulty: 'intermediate', duration_mins: 45, notes: '' })
    } catch {
      toast('Failed to generate workout. Check your API key.', 'error')
    }
  }

  const handleActivate = async (id: number) => {
    await activate.mutateAsync(id)
    toast('Workout plan activated!', 'success')
  }

  const handleDelete = async (id: number) => {
    await remove.mutateAsync(id)
    toast('Workout plan deleted.', 'info')
  }

  if (isLoading) return <div className="flex justify-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Workout Planner</h1>
          <p className="text-slate-400 mt-1">AI-generated workout plans tailored to your goals.</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} /> Generate Plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <Card className="text-center py-16">
          <Dumbbell size={40} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-slate-300 font-medium mb-2">No workout plans yet</h3>
          <p className="text-slate-500 text-sm mb-6">Generate an AI workout plan to get started.</p>
          <Button onClick={() => setShowModal(true)}><Plus size={16} /> Generate Your First Plan</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <WorkoutPlanCard
              key={plan.id}
              plan={plan}
              expanded={expandedId === plan.id}
              onToggle={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
              onActivate={() => handleActivate(plan.id)}
              onDelete={() => handleDelete(plan.id)}
            />
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Generate AI Workout" size="lg">
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium text-slate-300 mb-3">Muscle Groups</p>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_GROUPS.map((m) => (
                <button
                  key={m}
                  onClick={() => toggleMuscle(m)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    form.muscle_groups.includes(m)
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Difficulty"
              options={DIFFICULTY_OPTIONS}
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            />
            <Input
              label="Duration (minutes)"
              type="number"
              min={15}
              max={120}
              value={form.duration_mins}
              onChange={(e) => setForm({ ...form, duration_mins: Number(e.target.value) })}
            />
          </div>
          <Input
            label="Additional Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="e.g. no equipment, focus on hypertrophy..."
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleGenerate} loading={generate.isPending} className="flex-1">
              <Zap size={16} /> Generate with AI
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function WorkoutPlanCard({
  plan, expanded, onToggle, onActivate, onDelete,
}: {
  plan: WorkoutPlan
  expanded: boolean
  onToggle: () => void
  onActivate: () => void
  onDelete: () => void
}) {
  return (
    <Card className={plan.is_active ? 'border-indigo-500/50' : ''}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-100">{plan.name}</h3>
            {plan.is_active && <Badge variant="indigo">Active</Badge>}
            <Badge variant="slate">{plan.difficulty}</Badge>
            {plan.duration_mins && <Badge variant="slate">{plan.duration_mins} min</Badge>}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {plan.muscle_groups.map((m) => (
              <span key={m} className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded capitalize">{m}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          {!plan.is_active && (
            <Button variant="ghost" size="sm" onClick={onActivate}>
              <CheckCircle size={15} /> Activate
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
            <Trash2 size={15} />
          </Button>
          <button onClick={onToggle} className="text-slate-400 hover:text-slate-100 transition-colors p-1">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {expanded && plan.exercises.length > 0 && (
        <div className="mt-4 border-t border-slate-700 pt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-400 text-xs uppercase">
                <th className="text-left py-1 pr-4">Exercise</th>
                <th className="text-center py-1 pr-4">Sets</th>
                <th className="text-center py-1 pr-4">Reps</th>
                <th className="text-center py-1 pr-4">Rest</th>
                <th className="text-left py-1">Notes</th>
              </tr>
            </thead>
            <tbody>
              {plan.exercises.map((ex) => (
                <tr key={ex.id} className="border-t border-slate-700/50">
                  <td className="py-2 pr-4 text-slate-200 font-medium">{ex.name}</td>
                  <td className="py-2 pr-4 text-slate-300 text-center">{ex.sets ?? '—'}</td>
                  <td className="py-2 pr-4 text-slate-300 text-center">{ex.reps ?? '—'}</td>
                  <td className="py-2 pr-4 text-slate-400 text-center">{ex.rest_seconds ? `${ex.rest_seconds}s` : '—'}</td>
                  <td className="py-2 text-slate-500 text-xs">{ex.notes ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
