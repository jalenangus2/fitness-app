import { useState, useEffect } from 'react'
import { Plus, Zap, CheckCircle, Trash2, ChevronDown, ChevronUp, Dumbbell, Play, Timer, X, Minus } from 'lucide-react'
import { 
  useWorkouts, useGenerateWorkout, useCreateWorkout, useActivateWorkout, 
  useDeleteWorkout, useStartSession, useLogSet, useFinishSession 
} from '../hooks/useWorkout'
import { useToast } from '../components/ui/Toast'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Select from '../components/ui/Select'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'
import type { WorkoutPlan, WorkoutExercise } from '../types'

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core', 'Full Body']

export default function WorkoutPage() {
  const { data: plans = [], isLoading } = useWorkouts()
  const { toast } = useToast()
  
  // Mutations
  const generate = useGenerateWorkout()
  const createManual = useCreateWorkout()
  const activate = useActivateWorkout()
  const remove = useDeleteWorkout()
  const startSession = useStartSession()
  const logSet = useLogSet()
  const finishSession = useFinishSession()

  // UI State
  const [showModal, setShowModal] = useState(false)
  const [createMode, setCreateMode] = useState<'ai' | 'manual'>('ai')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  
  // Live Tracking State
  const [activeSession, setActiveSession] = useState<{ id: number; plan: WorkoutPlan } | null>(null)
  const [restTimer, setRestTimer] = useState(0)

  // Form State
  const [form, setForm] = useState({ name: '', muscle_groups: [] as string[], difficulty: 'intermediate', duration_mins: 45, notes: '' })
  const [manualExercises, setManualExercises] = useState<Partial<WorkoutExercise>[]>([])

  useEffect(() => {
    let interval: any;
    if (restTimer > 0) interval = setInterval(() => setRestTimer(r => r - 1), 1000)
    return () => clearInterval(interval)
  }, [restTimer])

  const toggleMuscle = (m: string) => {
    setForm(f => ({ ...f, muscle_groups: f.muscle_groups.includes(m) ? f.muscle_groups.filter(x => x !== m) : [...f.muscle_groups, m] }))
  }

  const handleCreate = async () => {
    if (createMode === 'ai') {
      await generate.mutateAsync({ ...form, muscle_groups: form.muscle_groups.map(m => m.toLowerCase()) })
      toast('AI Plan generated!', 'success')
    } else {
      if (!form.name) return toast('Name is required', 'error')
      await createManual.mutateAsync({ ...form, is_ai_generated: false, exercises: manualExercises as any })
      toast('Manual plan created!', 'success')
    }
    setShowModal(false)
  }

  const handleStartWorkout = async (plan: WorkoutPlan) => {
    const session = await startSession.mutateAsync(plan.id!)
    setActiveSession({ id: session.id, plan })
    toast('Workout Started! Let\'s go!', 'success')
  }

  const handleLogSet = async (exerciseName: string, setNumber: number, reps: number, weight: number, restSeconds: number) => {
    if (!activeSession) return
    await logSet.mutateAsync({ sessionId: activeSession.id, data: { exercise_name: exerciseName, set_number: setNumber, reps_completed: reps, weight_lbs: weight } })
    setRestTimer(restSeconds || 60)
    toast(`Set ${setNumber} logged!`, 'success')
  }

  const handleFinishWorkout = async () => {
    if (!activeSession) return
    if (confirm("Are you sure you want to finish this workout?")) {
      await finishSession.mutateAsync(activeSession.id)
      setActiveSession(null)
      toast('Workout completed! Great job!', 'success')
    }
  }

  // --- ACTIVE WORKOUT VIEW (MOBILE FRIENDLY) ---
  if (activeSession) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col overflow-hidden text-white">
        <div className="bg-slate-800 p-4 shadow-md flex justify-between items-center z-10">
          <div>
            <h2 className="text-xl font-bold text-indigo-400">{activeSession.plan.name}</h2>
            <p className="text-sm text-slate-400">Active Workout</p>
          </div>
          {restTimer > 0 ? (
            <div className="flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full animate-pulse">
              <Timer size={16} /> {Math.floor(restTimer / 60)}:{(restTimer % 60).toString().padStart(2, '0')}
            </div>
          ) : (
             <Button variant="ghost" size="sm" onClick={() => setRestTimer(0)}><Timer size={16} className="text-slate-500"/></Button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
          {activeSession.plan.exercises.map((ex, i) => (
            <ActiveExerciseCard key={i} exercise={ex} onLogSet={(setNum, reps, weight) => handleLogSet(ex.name, setNum, reps, weight, ex.rest_seconds || 60)} />
          ))}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 via-slate-900 to-transparent">
          <Button onClick={handleFinishWorkout} className="w-full py-4 text-lg shadow-xl shadow-indigo-500/20">
            Complete Workout
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) return <div className="flex justify-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Workout Planner</h1>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Plan
        </Button>
      </div>

      <div className="space-y-4">
        {plans.map((plan) => (
          <WorkoutPlanCard
            key={plan.id} plan={plan} expanded={expandedId === plan.id}
            onToggle={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
            onActivate={() => activate.mutateAsync(plan.id!)}
            onDelete={() => remove.mutateAsync(plan.id!)}
            onStart={() => handleStartWorkout(plan)}
          />
        ))}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Workout Plan" size="lg">
        <div className="flex bg-slate-800 p-1 rounded-lg mb-4">
          <button onClick={() => setCreateMode('ai')} className={`flex-1 py-2 text-sm rounded-md transition ${createMode === 'ai' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>AI Generate</button>
          <button onClick={() => setCreateMode('manual')} className={`flex-1 py-2 text-sm rounded-md transition ${createMode === 'manual' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Build Manual</button>
        </div>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
          {createMode === 'manual' && (
             <Input label="Plan Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Push Day" />
          )}
          
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">Target Muscles</p>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_GROUPS.map(m => (
                <button key={m} onClick={() => toggleMuscle(m)} className={`px-3 py-1 text-xs rounded-full border ${form.muscle_groups.includes(m) ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-700 border-slate-600'}`}>{m}</button>
              ))}
            </div>
          </div>

          {createMode === 'manual' && (
            <div className="space-y-3 pt-4 border-t border-slate-700">
              <h4 className="text-sm text-slate-300 font-medium flex justify-between">Exercises <button onClick={() => setManualExercises([...manualExercises, { name: '', sets: 3, reps: '10' }])} className="text-indigo-400 text-xs flex items-center"><Plus size={12}/> Add</button></h4>
              {manualExercises.map((ex, i) => (
                <div key={i} className="flex gap-2 items-center bg-slate-800 p-2 rounded">
                  <Input value={ex.name || ''} onChange={e => { const nm = [...manualExercises]; nm[i].name = e.target.value; setManualExercises(nm); }} placeholder="Exercise" className="flex-1" />
                  <Input type="number" value={ex.sets || ''} onChange={e => { const nm = [...manualExercises]; nm[i].sets = Number(e.target.value); setManualExercises(nm); }} placeholder="Sets" className="w-16" />
                  <button onClick={() => setManualExercises(manualExercises.filter((_, idx) => idx !== i))} className="p-2 text-red-400"><X size={16}/></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-4 mt-4 border-t border-slate-700">
          <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
          <Button onClick={handleCreate} className="flex-1">{createMode === 'ai' ? <><Zap size={16} /> Generate</> : 'Save Plan'}</Button>
        </div>
      </Modal>
    </div>
  )
}

// --- SUB-COMPONENTS ---

function WorkoutPlanCard({ plan, expanded, onToggle, onActivate, onDelete, onStart }: any) {
  return (
    <Card className={plan.is_active ? 'border-indigo-500/50 shadow-md shadow-indigo-500/10' : ''}>
      <div className="flex items-start justify-between">
        <div className="flex-1" onClick={onToggle}>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-100">{plan.name}</h3>
            {plan.is_ai_generated && <Zap size={12} className="text-yellow-400" />}
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {plan.is_active && <Badge variant="indigo">Active</Badge>}
            {plan.muscle_groups.map((m: string) => <span key={m} className="text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300 capitalize">{m}</span>)}
          </div>
        </div>
        <div className="flex items-center gap-1">
           {plan.is_active && (
             <Button size="sm" onClick={onStart} className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full px-4"><Play size={14} className="mr-1"/> Start</Button>
           )}
           <button onClick={onToggle} className="p-2 text-slate-400"><ChevronDown size={18} className={expanded ? "rotate-180 transition-transform" : "transition-transform"} /></button>
        </div>
      </div>
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
          {plan.exercises.map((ex: any) => (
             <div key={ex.id} className="flex justify-between text-sm text-slate-300">
                <span>{ex.name}</span>
                <span className="text-slate-500">{ex.sets}x{ex.reps}</span>
             </div>
          ))}
          <div className="flex gap-2 pt-2">
            {!plan.is_active && <Button variant="secondary" size="sm" onClick={onActivate} className="flex-1">Set Active</Button>}
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-400 bg-red-500/10 flex-none px-3"><Trash2 size={16}/></Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function ActiveExerciseCard({ exercise, onLogSet }: { exercise: WorkoutExercise, onLogSet: (set: number, reps: number, weight: number) => void }) {
  const [currentSet, setCurrentSet] = useState(1);
  const [reps, setReps] = useState(Number(exercise.reps) || 10);
  const [weight, setWeight] = useState(0);

  const adjust = (setter: any, val: number, amount: number) => setter(Math.max(0, val + amount));

  return (
    <Card className="bg-slate-800 border-slate-700">
      <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
        <h3 className="font-semibold text-lg text-slate-100">{exercise.name}</h3>
        <span className="text-slate-400 text-sm">Set {currentSet} of {exercise.sets || '?'}</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Weight Adjuster */}
        <div className="bg-slate-900 rounded-lg p-2 text-center">
          <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Weight (lbs)</p>
          <div className="flex items-center justify-between">
            <button onClick={() => adjust(setWeight, weight, -5)} className="bg-slate-700 p-2 rounded-md active:bg-slate-600"><Minus size={16}/></button>
            <span className="text-2xl font-bold">{weight}</span>
            <button onClick={() => adjust(setWeight, weight, 5)} className="bg-slate-700 p-2 rounded-md active:bg-slate-600"><Plus size={16}/></button>
          </div>
        </div>

        {/* Reps Adjuster */}
        <div className="bg-slate-900 rounded-lg p-2 text-center">
          <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Reps</p>
          <div className="flex items-center justify-between">
            <button onClick={() => adjust(setReps, reps, -1)} className="bg-slate-700 p-2 rounded-md active:bg-slate-600"><Minus size={16}/></button>
            <span className="text-2xl font-bold">{reps}</span>
            <button onClick={() => adjust(setReps, reps, 1)} className="bg-slate-700 p-2 rounded-md active:bg-slate-600"><Plus size={16}/></button>
          </div>
        </div>
      </div>

      <Button 
        onClick={() => { onLogSet(currentSet, reps, weight); setCurrentSet(c => c + 1); }} 
        className="w-full bg-indigo-600 hover:bg-indigo-500 py-3"
      >
        <CheckCircle size={18} className="mr-2"/> Log Set {currentSet}
      </Button>
    </Card>
  )
}