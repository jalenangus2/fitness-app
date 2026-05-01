import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Plus, Zap, CheckCircle, Trash2, ChevronDown, Play, Timer, X, Minus, BarChart2, Dumbbell, ClipboardList } from 'lucide-react'
import {
  useWorkouts, useGenerateWorkout, useCreateWorkout, useActivateWorkout,
  useDeleteWorkout, useStartSession, useLogSet, useFinishSession,
  useWorkoutSessions, useDeleteSession,
} from '../hooks/useWorkout'
import { useToast } from '../components/ui/Toast'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'
import type { WorkoutPlan, WorkoutExercise, WorkoutSession } from '../types'

const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core', 'Full Body']

type LogExercise = { name: string; sets: { reps: number; weight: number }[] }

const defaultLogExercise = (): LogExercise => ({ name: '', sets: [{ reps: 10, weight: 0 }] })

export default function WorkoutPage() {
  const { data: plans = [], isLoading } = useWorkouts()
  const { data: sessions = [] } = useWorkoutSessions()
  const { toast } = useToast()

  const generate = useGenerateWorkout()
  const createManual = useCreateWorkout()
  const activate = useActivateWorkout()
  const remove = useDeleteWorkout()
  const startSession = useStartSession()
  const logSet = useLogSet()
  const finishSession = useFinishSession()
  const deleteSession = useDeleteSession()

  const [activeTab, setActiveTab] = useState<'plans' | 'history'>('plans')
  const [showModal, setShowModal] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)
  const [createMode, setCreateMode] = useState<'ai' | 'manual'>('ai')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null)

  const [activeSession, setActiveSession] = useState<{ id: number; plan: WorkoutPlan; startedAt: number } | null>(null)
  const [restTimer, setRestTimer] = useState(0)

  const [form, setForm] = useState({ name: '', muscle_groups: [] as string[], difficulty: 'intermediate', duration_mins: 45, notes: '' })
  const [manualExercises, setManualExercises] = useState<Partial<WorkoutExercise>[]>([])

  const today = new Date().toISOString().split('T')[0]
  const [logForm, setLogForm] = useState({ name: '', date: today, duration_mins: '', plan_id: '' })
  const [logExercises, setLogExercises] = useState<LogExercise[]>([defaultLogExercise()])

  useEffect(() => {
    let interval: any
    if (restTimer > 0) interval = setInterval(() => setRestTimer(r => r - 1), 1000)
    return () => clearInterval(interval)
  }, [restTimer])

  const toggleMuscle = (m: string) =>
    setForm(f => ({ ...f, muscle_groups: f.muscle_groups.includes(m) ? f.muscle_groups.filter(x => x !== m) : [...f.muscle_groups, m] }))

  const handleCreate = async () => {
    try {
      if (createMode === 'ai') {
        await generate.mutateAsync({ ...form, muscle_groups: form.muscle_groups.map(m => m.toLowerCase()) })
        toast('AI Plan generated!', 'success')
      } else {
        if (!form.name) return toast('Name is required', 'error')
        await createManual.mutateAsync({ ...form, exercises: manualExercises as any } as any)
        toast('Manual plan created!', 'success')
      }
      setShowModal(false)
    } catch {
      toast('Failed to save plan. Please try again.', 'error')
    }
  }

  const handleStartWorkout = async (plan: WorkoutPlan) => {
    const session = await startSession.mutateAsync({
      name: `${plan.name} — Session`,
      session_date: today as any,
      plan_id: plan.id,
    })
    setActiveSession({ id: session.id, plan, startedAt: Date.now() })
    toast("Workout started! Let's go!", 'success')
  }

  const handleLogSet = async (exerciseName: string, setNumber: number, reps: number, weight: number, restSeconds: number) => {
    if (!activeSession) return
    await logSet.mutateAsync({ sessionId: activeSession.id, data: { exercise_name: exerciseName, set_number: setNumber, reps, weight_lbs: weight } })
    setRestTimer(restSeconds || 60)
    toast(`Set ${setNumber} logged!`, 'success')
  }

  const handleFinishWorkout = async () => {
    if (!activeSession) return
    if (confirm('Finish this workout?')) {
      const durationMins = Math.round((Date.now() - activeSession.startedAt) / 60000)
      await finishSession.mutateAsync({ sessionId: activeSession.id, durationMins })
      setActiveSession(null)
      toast('Workout completed! Great job!', 'success')
    }
  }

  const handleLogPastWorkout = async () => {
    if (!logForm.name.trim()) return toast('Workout name is required', 'error')
    const validExercises = logExercises.filter(ex => ex.name.trim())
    if (validExercises.length === 0) return toast('Add at least one exercise', 'error')

    const set_logs = validExercises.flatMap(ex =>
      ex.sets.map((s, si) => ({
        exercise_name: ex.name.trim(),
        set_number: si + 1,
        reps: s.reps,
        weight_lbs: s.weight,
      }))
    )

    try {
      await startSession.mutateAsync({
        name: logForm.name.trim(),
        session_date: logForm.date as any,
        plan_id: logForm.plan_id ? Number(logForm.plan_id) : undefined,
        duration_mins: logForm.duration_mins ? Number(logForm.duration_mins) : undefined,
        set_logs,
      } as any)
      toast('Workout logged!', 'success')
      setShowLogModal(false)
      setLogForm({ name: '', date: today, duration_mins: '', plan_id: '' })
      setLogExercises([defaultLogExercise()])
      setActiveTab('history')
    } catch {
      toast('Failed to log workout. Please try again.', 'error')
    }
  }

  const updateLogExercise = (i: number, field: string, value: string) => {
    setLogExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex))
  }

  const updateLogSet = (exIdx: number, setIdx: number, field: string, value: number) => {
    setLogExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : {
      ...ex,
      sets: ex.sets.map((s, si) => si !== setIdx ? s : { ...s, [field]: value }),
    }))
  }

  const addSetToExercise = (exIdx: number) =>
    setLogExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : { ...ex, sets: [...ex.sets, { reps: 10, weight: 0 }] }))

  const removeSetFromExercise = (exIdx: number, setIdx: number) =>
    setLogExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) }))

  // Stats
  const totalSessions = sessions.length
  const totalSets = sessions.reduce((a, s) => a + s.set_logs.length, 0)
  const totalVolume = sessions.reduce((a, s) => a + s.set_logs.reduce((b, l) => b + (l.reps ?? 0) * (l.weight_lbs ?? 0), 0), 0)

  // Active workout full-screen view
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
            <Button variant="ghost" size="sm" onClick={() => setRestTimer(0)}><Timer size={16} className="text-slate-500" /></Button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
          {activeSession.plan.exercises.map((ex, i) => (
            <ActiveExerciseCard
              key={i} exercise={ex}
              onLogSet={(setNum, reps, weight) => handleLogSet(ex.name, setNum, reps, weight, ex.rest_seconds || 60)}
            />
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
        <h1 className="text-2xl font-bold text-slate-100">Workout</h1>
        {activeTab === 'plans' && (
          <Button onClick={() => setShowModal(true)}><Plus size={16} /> New Plan</Button>
        )}
        {activeTab === 'history' && (
          <Button onClick={() => setShowLogModal(true)}><ClipboardList size={16} /> Log Workout</Button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex bg-slate-800 p-1 rounded-xl w-fit gap-1">
        <button onClick={() => setActiveTab('plans')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'plans' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
          <Dumbbell size={14} /> Plans
        </button>
        <button onClick={() => setActiveTab('history')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
          <BarChart2 size={14} /> History
        </button>
      </div>

      {/* Plans tab */}
      {activeTab === 'plans' && (
        <div className="space-y-4">
          {plans.length === 0 && (
            <Card className="text-center py-10">
              <Dumbbell size={32} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400">No workout plans yet.</p>
              <Button className="mt-4" onClick={() => setShowModal(true)}><Plus size={16} /> Create First Plan</Button>
            </Card>
          )}
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
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center py-3">
              <p className="text-2xl font-bold text-indigo-400">{totalSessions}</p>
              <p className="text-xs text-slate-400 mt-0.5">Sessions</p>
            </Card>
            <Card className="text-center py-3">
              <p className="text-2xl font-bold text-emerald-400">{totalSets}</p>
              <p className="text-xs text-slate-400 mt-0.5">Total Sets</p>
            </Card>
            <Card className="text-center py-3">
              <p className="text-2xl font-bold text-yellow-400">{totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume.toLocaleString()}</p>
              <p className="text-xs text-slate-400 mt-0.5">Vol (lbs)</p>
            </Card>
          </div>

          {sessions.length === 0 && (
            <Card className="text-center py-10">
              <BarChart2 size={32} className="mx-auto text-slate-600 mb-3" />
              <p className="text-slate-400">No workouts logged yet.</p>
              <Button className="mt-4" onClick={() => setShowLogModal(true)}><ClipboardList size={16} /> Log a Workout</Button>
            </Card>
          )}
          {sessions.map((session) => (
            <SessionCard
              key={session.id} session={session}
              expanded={expandedSessionId === session.id}
              onToggle={() => setExpandedSessionId(expandedSessionId === session.id ? null : session.id)}
              onDelete={() => deleteSession.mutateAsync(session.id)}
            />
          ))}
        </div>
      )}

      {/* Create plan modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Workout Plan" size="lg">
        <div className="flex bg-slate-800 p-1 rounded-lg mb-4">
          <button onClick={() => setCreateMode('ai')} className={`flex-1 py-2 text-sm rounded-md transition ${createMode === 'ai' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>AI Generate</button>
          <button onClick={() => setCreateMode('manual')} className={`flex-1 py-2 text-sm rounded-md transition ${createMode === 'manual' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Build Manual</button>
        </div>
        <div className="space-y-4">
          {createMode === 'manual' && (
            <Input label="Plan Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Push Day" />
          )}
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">Target Muscles</p>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_GROUPS.map(m => (
                <button key={m} onClick={() => toggleMuscle(m)} className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${form.muscle_groups.includes(m) ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'}`}>{m}</button>
              ))}
            </div>
          </div>
          {createMode === 'manual' && (
            <div className="space-y-3 pt-4 border-t border-slate-700">
              <h4 className="text-sm text-slate-300 font-medium flex justify-between">
                Exercises
                <button onClick={() => setManualExercises([...manualExercises, { name: '', sets: 3, reps: '10' }])} className="text-indigo-400 text-xs flex items-center gap-1"><Plus size={12} /> Add</button>
              </h4>
              {manualExercises.map((ex, i) => (
                <div key={i} className="flex gap-2 items-center bg-slate-800 p-2 rounded">
                  <Input value={ex.name || ''} onChange={e => { const nm = [...manualExercises]; nm[i].name = e.target.value; setManualExercises(nm) }} placeholder="Exercise name" className="flex-1" />
                  <Input type="number" value={ex.sets || ''} onChange={e => { const nm = [...manualExercises]; nm[i].sets = Number(e.target.value); setManualExercises(nm) }} placeholder="Sets" className="w-16" />
                  <button onClick={() => setManualExercises(manualExercises.filter((_, idx) => idx !== i))} className="p-2 text-red-400"><X size={16} /></button>
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

      {/* Log past workout modal */}
      <Modal isOpen={showLogModal} onClose={() => setShowLogModal(false)} title="Log a Workout" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Workout Name" value={logForm.name} onChange={e => setLogForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Leg Day" />
            <Input label="Date" type="date" value={logForm.date} onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Duration (mins)" type="number" value={logForm.duration_mins} onChange={e => setLogForm(f => ({ ...f, duration_mins: e.target.value }))} placeholder="e.g. 60" />
            <div>
              <p className="text-sm font-medium text-slate-300 mb-1.5">Plan (optional)</p>
              <select
                value={logForm.plan_id}
                onChange={e => setLogForm(f => ({ ...f, plan_id: e.target.value }))}
                className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">No plan</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Exercises */}
          <div className="space-y-4 pt-2 border-t border-slate-700">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold text-slate-300">Exercises</p>
              <button onClick={() => setLogExercises(prev => [...prev, defaultLogExercise()])}
                className="text-indigo-400 text-xs flex items-center gap-1 hover:text-indigo-300">
                <Plus size={12} /> Add Exercise
              </button>
            </div>

            {logExercises.map((ex, exIdx) => (
              <div key={exIdx} className="bg-slate-800/60 rounded-xl p-3 space-y-3">
                <div className="flex gap-2 items-center">
                  <Input
                    value={ex.name}
                    onChange={e => updateLogExercise(exIdx, 'name', e.target.value)}
                    placeholder="Exercise name (e.g. Squat)"
                    className="flex-1"
                  />
                  {logExercises.length > 1 && (
                    <button onClick={() => setLogExercises(prev => prev.filter((_, i) => i !== exIdx))}
                      className="text-red-400 p-1.5 flex-shrink-0">
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Sets header */}
                <div className="grid grid-cols-3 gap-2 text-xs text-slate-500 px-1">
                  <span>Set</span><span>Weight (lbs)</span><span>Reps</span>
                </div>

                {ex.sets.map((s, setIdx) => (
                  <div key={setIdx} className="grid grid-cols-3 gap-2 items-center">
                    <span className="text-sm text-slate-400 pl-1">#{setIdx + 1}</span>
                    <input
                      type="number" min="0" value={s.weight}
                      onChange={e => updateLogSet(exIdx, setIdx, 'weight', Number(e.target.value))}
                      className="bg-slate-700 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <div className="flex gap-1 items-center">
                      <input
                        type="number" min="0" value={s.reps}
                        onChange={e => updateLogSet(exIdx, setIdx, 'reps', Number(e.target.value))}
                        className="bg-slate-700 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      {ex.sets.length > 1 && (
                        <button onClick={() => removeSetFromExercise(exIdx, setIdx)} className="text-slate-500 hover:text-red-400 p-1">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <button onClick={() => addSetToExercise(exIdx)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 pl-1">
                  <Plus size={11} /> Add Set
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-4 mt-2 border-t border-slate-700">
          <Button variant="secondary" onClick={() => setShowLogModal(false)} className="flex-1">Cancel</Button>
          <Button onClick={handleLogPastWorkout} className="flex-1"><CheckCircle size={16} /> Save Workout</Button>
        </div>
      </Modal>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function WorkoutPlanCard({ plan, expanded, onToggle, onActivate, onDelete, onStart }: any) {
  return (
    <Card className={plan.is_active ? 'border-indigo-500/50 shadow-md shadow-indigo-500/10' : ''}>
      <div className="flex items-start justify-between">
        <div className="flex-1 cursor-pointer" onClick={onToggle}>
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
            <Button size="sm" onClick={onStart} className="bg-emerald-600 hover:bg-emerald-500 rounded-full px-4">
              <Play size={14} className="mr-1" /> Start
            </Button>
          )}
          <button onClick={onToggle} className="p-2 text-slate-400">
            <ChevronDown size={18} className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
          {plan.exercises.map((ex: any) => (
            <div key={ex.id} className="flex justify-between text-sm text-slate-300">
              <span>{ex.name}</span>
              <span className="text-slate-500">{ex.sets}×{ex.reps}</span>
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            {!plan.is_active && <Button variant="secondary" size="sm" onClick={onActivate} className="flex-1">Set Active</Button>}
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-400 bg-red-500/10 flex-none px-3"><Trash2 size={16} /></Button>
          </div>
        </div>
      )}
    </Card>
  )
}

function SessionCard({ session, expanded, onToggle, onDelete }: { session: WorkoutSession; expanded: boolean; onToggle: () => void; onDelete: () => void }) {
  const setCount = session.set_logs.length
  const volume = session.set_logs.reduce((a, l) => a + (l.reps ?? 0) * (l.weight_lbs ?? 0), 0)
  const byExercise = session.set_logs.reduce<Record<string, typeof session.set_logs>>((acc, log) => {
    if (!acc[log.exercise_name]) acc[log.exercise_name] = []
    acc[log.exercise_name].push(log)
    return acc
  }, {})

  return (
    <Card>
      <div className="flex items-start justify-between cursor-pointer" onClick={onToggle}>
        <div>
          <p className="font-semibold text-slate-100">{session.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{format(parseISO(session.session_date), 'EEEE, MMM d, yyyy')}</p>
          <div className="flex gap-3 mt-2 text-xs text-slate-400">
            {session.duration_mins && <span>{session.duration_mins} min</span>}
            <span>{setCount} set{setCount !== 1 ? 's' : ''}</span>
            {volume > 0 && <span>{volume.toLocaleString()} lbs vol</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-slate-500 hover:text-red-400 p-1">
            <Trash2 size={14} />
          </button>
          <ChevronDown size={16} className={`text-slate-400 ${expanded ? 'rotate-180' : ''} transition-transform`} />
        </div>
      </div>
      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-700 space-y-4">
          {Object.entries(byExercise).map(([exercise, logs]) => (
            <div key={exercise}>
              <p className="text-sm font-medium text-slate-300 mb-2">{exercise}</p>
              <div className="space-y-1">
                {logs.map((log) => (
                  <div key={log.id} className="flex justify-between text-xs text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded">
                    <span>Set {log.set_number}</span>
                    <span className="text-slate-300">
                      {log.weight_lbs ? `${log.weight_lbs} lbs` : 'BW'} × {log.reps ?? '—'} reps
                    </span>
                    {log.rpe && <span className="text-yellow-400">RPE {log.rpe}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {setCount === 0 && <p className="text-sm text-slate-500">No sets logged.</p>}
        </div>
      )}
    </Card>
  )
}

function ActiveExerciseCard({ exercise, onLogSet }: { exercise: WorkoutExercise; onLogSet: (set: number, reps: number, weight: number) => void }) {
  const [currentSet, setCurrentSet] = useState(1)
  const [reps, setReps] = useState(Number(exercise.reps) || 10)
  const [weight, setWeight] = useState(0)
  const adjust = (setter: any, val: number, amount: number) => setter(Math.max(0, val + amount))

  return (
    <Card className="bg-slate-800 border-slate-700">
      <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
        <h3 className="font-semibold text-lg text-slate-100">{exercise.name}</h3>
        <span className="text-slate-400 text-sm">Set {currentSet} of {exercise.sets || '?'}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-900 rounded-lg p-2 text-center">
          <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Weight (lbs)</p>
          <div className="flex items-center justify-between">
            <button onClick={() => adjust(setWeight, weight, -5)} className="bg-slate-700 p-3 rounded-md active:bg-slate-600"><Minus size={16} /></button>
            <span className="text-2xl font-bold">{weight}</span>
            <button onClick={() => adjust(setWeight, weight, 5)} className="bg-slate-700 p-3 rounded-md active:bg-slate-600"><Plus size={16} /></button>
          </div>
        </div>
        <div className="bg-slate-900 rounded-lg p-2 text-center">
          <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Reps</p>
          <div className="flex items-center justify-between">
            <button onClick={() => adjust(setReps, reps, -1)} className="bg-slate-700 p-3 rounded-md active:bg-slate-600"><Minus size={16} /></button>
            <span className="text-2xl font-bold">{reps}</span>
            <button onClick={() => adjust(setReps, reps, 1)} className="bg-slate-700 p-3 rounded-md active:bg-slate-600"><Plus size={16} /></button>
          </div>
        </div>
      </div>
      <Button onClick={() => { onLogSet(currentSet, reps, weight); setCurrentSet(c => c + 1) }} className="w-full py-3">
        <CheckCircle size={18} className="mr-2" /> Log Set {currentSet}
      </Button>
    </Card>
  )
}
