import { useState, useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { Plus, Zap, CheckCircle, Trash2, ChevronDown, Play, Timer, X, Minus, BarChart2, Dumbbell, ClipboardList, Pencil, Check } from 'lucide-react'
import {
  useWorkouts, useCreateWorkout, useActivateWorkout, useUpdateWorkout,
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

type LogExercise = { name: string; sets: number; reps: number; weight: number; use_seconds: boolean; duration_secs: number }

const defaultLogExercise = (): LogExercise => ({ name: '', sets: 3, reps: 10, weight: 0, use_seconds: false, duration_secs: 45 })

export default function WorkoutPage() {
  const { data: plans = [], isLoading } = useWorkouts()
  const { data: sessions = [] } = useWorkoutSessions()
  const { toast } = useToast()

  const createManual = useCreateWorkout()
  const activate = useActivateWorkout()
  const updatePlan = useUpdateWorkout()
  const remove = useDeleteWorkout()
  const startSession = useStartSession()
  const logSet = useLogSet()
  const finishSession = useFinishSession()
  const deleteSession = useDeleteSession()

  const [activeTab, setActiveTab] = useState<'plans' | 'history'>('plans')
  const [showModal, setShowModal] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importForLog, setImportForLog] = useState(false)
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

  const parseImportText = () => {
    const lines = importText.split('\n').filter(l => l.trim())
    const parsed: Partial<WorkoutExercise>[] = []
    for (const line of lines) {
      // Seconds format: "Plank 3x45s" — must check before reps formats
      const withSecs = line.match(/^(.+?)\s+(\d+)\s*[x×]\s*(\d+)\s*s\b/i)
      const withWeight = line.match(/^(.+?)\s+(\d+)\s*[x×]\s*(\d+)\s*[-–]\s*([\d.]+)/i)
      const noWeight = line.match(/^(.+?)\s+(\d+)\s*[x×]\s*(\d+)/i)
      if (withSecs) {
        parsed.push({ name: withSecs[1].trim(), sets: Number(withSecs[2]), duration_secs: Number(withSecs[3]) })
      } else if (withWeight) {
        parsed.push({ name: withWeight[1].trim(), sets: Number(withWeight[2]), reps: withWeight[3], weight_lbs: Number(withWeight[4]) })
      } else if (noWeight) {
        parsed.push({ name: noWeight[1].trim(), sets: Number(noWeight[2]), reps: noWeight[3] })
      } else if (line.trim() && !/^\d/.test(line.trim())) {
        parsed.push({ name: line.trim(), sets: 3, reps: '10' })
      }
    }
    if (parsed.length > 0) {
      if (importForLog) {
        setLogExercises(parsed.map(ex => ({
          name: ex.name || '',
          sets: ex.sets ?? 3,
          reps: Number(ex.reps) || 10,
          weight: ex.weight_lbs ?? 0,
          use_seconds: !!ex.duration_secs,
          duration_secs: ex.duration_secs ?? 45,
        })))
      } else {
        setManualExercises(parsed)
      }
      toast(`Imported ${parsed.length} exercise${parsed.length !== 1 ? 's' : ''}`, 'success')
    } else {
      toast('No exercises found — try "Bench Press 3x10 - 135" format', 'error')
    }
    setShowImport(false)
    setImportText('')
    setImportForLog(false)
  }

  const handleCreate = async () => {
    if (!form.name) return toast('Name is required', 'error')
    try {
      await createManual.mutateAsync({ ...form, exercises: manualExercises as any } as any)
      toast('Plan created!', 'success')
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

  const handleLogSet = async (exerciseName: string, setNumber: number, reps: number | null, weight: number, restSeconds: number, durationSecs?: number) => {
    if (!activeSession) return
    const data: any = { exercise_name: exerciseName, set_number: setNumber, weight_lbs: weight }
    if (durationSecs) { data.duration_secs = durationSecs } else { data.reps = reps }
    await logSet.mutateAsync({ sessionId: activeSession.id, data })
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
      Array.from({ length: ex.sets }, (_, i) => {
        const log: any = { exercise_name: ex.name.trim(), set_number: i + 1, weight_lbs: ex.weight }
        if (ex.use_seconds) { log.duration_secs = ex.duration_secs } else { log.reps = ex.reps }
        return log
      })
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

  const updateLogExercise = (i: number, field: keyof LogExercise, value: string | number) => {
    setLogExercises(prev => prev.map((ex, idx) => idx === i ? { ...ex, [field]: value } : ex))
  }

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
              onLogSet={(setNum, reps, weight, durationSecs) => handleLogSet(ex.name, setNum, reps, weight, ex.rest_seconds || 60, durationSecs)}
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
      <div className="flex bg-slate-800 p-1 rounded-xl w-full gap-1">
        <button onClick={() => setActiveTab('plans')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'plans' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
          <Dumbbell size={14} /> Plans
        </button>
        <button onClick={() => setActiveTab('history')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
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
              onRename={(name: string) => updatePlan.mutateAsync({ id: plan.id!, data: { name } }).then(() => toast('Plan renamed!', 'success'))}
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
        <div className="space-y-4">
          <Input label="Plan Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Push Day" />
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">Target Muscles</p>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_GROUPS.map(m => (
                <button key={m} onClick={() => toggleMuscle(m)} className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${form.muscle_groups.includes(m) ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300'}`}>{m}</button>
              ))}
            </div>
          </div>
          <div className="space-y-3 pt-4 border-t border-slate-700">
            <h4 className="text-sm text-slate-300 font-medium flex justify-between items-center">
              Exercises
              <div className="flex gap-3">
                <button onClick={() => { setImportForLog(false); setShowImport(true) }} className="text-slate-400 text-xs flex items-center gap-1 hover:text-slate-200">Paste from Notes</button>
                <button onClick={() => setManualExercises([...manualExercises, { name: '', sets: 3, reps: '10' }])} className="text-indigo-400 text-xs flex items-center gap-1"><Plus size={12} /> Add</button>
              </div>
            </h4>
            <div className="grid grid-cols-[1fr_44px_28px_44px_60px_28px] gap-1.5 text-xs text-slate-500 px-1">
              <span>Exercise</span><span>Sets</span><span></span><span>Reps/s</span><span>Wt</span><span />
            </div>
            {manualExercises.map((ex, i) => {
              const isTimedEx = ex.duration_secs !== undefined && ex.duration_secs !== null
              return (
                <div key={i} className="grid grid-cols-[1fr_44px_28px_44px_60px_28px] gap-1.5 items-center bg-slate-800 p-2 rounded">
                  <Input value={ex.name || ''} onChange={e => { const nm = [...manualExercises]; nm[i].name = e.target.value; setManualExercises(nm) }} placeholder="e.g. Bench Press" />
                  <Input type="number" value={ex.sets || ''} onChange={e => { const nm = [...manualExercises]; nm[i].sets = Number(e.target.value); setManualExercises(nm) }} placeholder="3" />
                  <button
                    title={isTimedEx ? 'Switch to reps' : 'Switch to seconds'}
                    onClick={() => { const nm = [...manualExercises]; if (isTimedEx) { nm[i].duration_secs = undefined; nm[i].reps = '10' } else { nm[i].duration_secs = 45; nm[i].reps = undefined } setManualExercises(nm) }}
                    className={`flex items-center justify-center rounded p-1 ${isTimedEx ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                  ><Timer size={15} /></button>
                  {isTimedEx
                    ? <Input type="number" value={ex.duration_secs ?? ''} onChange={e => { const nm = [...manualExercises]; nm[i].duration_secs = e.target.value ? Number(e.target.value) : undefined; setManualExercises(nm) }} placeholder="45" />
                    : <Input value={ex.reps || ''} onChange={e => { const nm = [...manualExercises]; nm[i].reps = e.target.value; setManualExercises(nm) }} placeholder="10" />
                  }
                  <Input type="number" value={ex.weight_lbs ?? ''} onChange={e => { const nm = [...manualExercises]; nm[i].weight_lbs = e.target.value ? Number(e.target.value) : undefined; setManualExercises(nm) }} placeholder="0" />
                  <button onClick={() => setManualExercises(manualExercises.filter((_, idx) => idx !== i))} className="p-2 text-red-400"><X size={16} /></button>
                </div>
              )
            })}
          </div>
        </div>
        <div className="flex gap-3 pt-4 mt-4 border-t border-slate-700">
          <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
          <Button onClick={handleCreate} className="flex-1">Save Plan</Button>
        </div>
      </Modal>

      {/* Import from notes modal */}
      <Modal isOpen={showImport} onClose={() => setShowImport(false)} title="Paste Workout from Notes" size="lg">
        <div className="space-y-3">
          <p className="text-xs text-slate-400">One exercise per line. Add "s" for seconds (Ab days):<br /><span className="text-slate-300 font-mono">Bench Press 4x8 - 135</span><br /><span className="text-slate-300 font-mono">Plank 3x45s · Crunches 3x30s</span><br /><span className="text-slate-500 font-mono">Pull-ups 3x8 (no weight)</span></p>
          <textarea
            className="w-full h-48 bg-slate-800 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
            placeholder={"Bench Press 4x8 - 135\nIncline DB Press 3x10 - 70\nPlank 3x45s\nCrunches 3x30s\nLeg Raises 3x20"}
            value={importText}
            onChange={e => setImportText(e.target.value)}
          />
        </div>
        <div className="flex gap-3 pt-4 mt-4 border-t border-slate-700">
          <Button variant="secondary" onClick={() => setShowImport(false)} className="flex-1">Cancel</Button>
          <Button onClick={parseImportText} className="flex-1">Import Exercises</Button>
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
          <div className="space-y-3 pt-2 border-t border-slate-700">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold text-slate-300">Exercises</p>
              <div className="flex gap-3">
                <button onClick={() => { setImportForLog(true); setShowImport(true) }} className="text-slate-400 text-xs flex items-center gap-1 hover:text-slate-200">Paste from Notes</button>
                <button onClick={() => setLogExercises(prev => [...prev, defaultLogExercise()])}
                  className="text-indigo-400 text-xs flex items-center gap-1 hover:text-indigo-300">
                  <Plus size={12} /> Add Exercise
                </button>
              </div>
            </div>

            {logExercises.map((ex, exIdx) => (
              <div key={exIdx} className="bg-slate-800/60 rounded-xl p-3 space-y-2">
                <div className="flex gap-2 items-center">
                  <Input
                    value={ex.name}
                    onChange={e => updateLogExercise(exIdx, 'name', e.target.value)}
                    placeholder="Exercise name (e.g. Squat)"
                    className="flex-1"
                  />
                  <button
                    title={ex.use_seconds ? 'Switch to reps' : 'Switch to seconds'}
                    onClick={() => setLogExercises(prev => prev.map((e, i) => i === exIdx ? { ...e, use_seconds: !e.use_seconds } : e))}
                    className={`p-1.5 rounded flex-shrink-0 ${ex.use_seconds ? 'text-indigo-400 bg-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                  ><Timer size={16} /></button>
                  {logExercises.length > 1 && (
                    <button onClick={() => setLogExercises(prev => prev.filter((_, i) => i !== exIdx))}
                      className="text-red-400 p-1.5 flex-shrink-0">
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className={`grid gap-2 ${ex.use_seconds ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Sets</p>
                    <input type="number" min="1" value={ex.sets}
                      onChange={e => updateLogExercise(exIdx, 'sets', Number(e.target.value))}
                      className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  {ex.use_seconds ? (
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Seconds</p>
                      <input type="number" min="1" value={ex.duration_secs}
                        onChange={e => updateLogExercise(exIdx, 'duration_secs', Number(e.target.value))}
                        className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Reps</p>
                        <input type="number" min="1" value={ex.reps}
                          onChange={e => updateLogExercise(exIdx, 'reps', Number(e.target.value))}
                          className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Wt (lbs)</p>
                        <input type="number" min="0" value={ex.weight}
                          onChange={e => updateLogExercise(exIdx, 'weight', Number(e.target.value))}
                          className="w-full bg-slate-700 border border-slate-600 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    </>
                  )}
                </div>
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

function WorkoutPlanCard({ plan, expanded, onToggle, onActivate, onDelete, onStart, onRename }: any) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(plan.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const save = () => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== plan.name) onRename(trimmed)
    setEditing(false)
  }
  const cancel = () => { setEditName(plan.name); setEditing(false) }

  return (
    <Card className={plan.is_active ? 'border-indigo-500/50 shadow-md shadow-indigo-500/10' : ''}>
      <div className="flex items-start justify-between">
        <div className="flex-1 cursor-pointer" onClick={onToggle}>
          <div className="flex items-center gap-2">
            {editing ? (
              <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
                <input
                  ref={inputRef}
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
                  className="flex-1 bg-slate-700 border border-indigo-500 rounded px-2 py-0.5 text-sm font-semibold text-slate-100 focus:outline-none"
                />
                <button onClick={save} className="text-emerald-400 p-1"><Check size={15} /></button>
                <button onClick={cancel} className="text-slate-400 p-1"><X size={15} /></button>
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-slate-100">{plan.name}</h3>
                <button onClick={e => { e.stopPropagation(); setEditing(true) }} className="text-slate-500 hover:text-slate-300 p-0.5">
                  <Pencil size={12} />
                </button>
              </>
            )}
            {plan.is_ai_generated && !editing && <Zap size={12} className="text-yellow-400" />}
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
              <span className="text-slate-500">
                {ex.sets}×{ex.duration_secs ? `${ex.duration_secs}s` : (ex.reps ?? '—')}
                {ex.weight_lbs ? <span className="text-slate-600 ml-1">· {ex.weight_lbs}lbs</span> : null}
              </span>
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
                      {log.duration_secs
                        ? `${log.duration_secs}s`
                        : `${log.weight_lbs ? `${log.weight_lbs} lbs` : 'BW'} × ${log.reps ?? '—'} reps`}
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

function ActiveExerciseCard({ exercise, onLogSet }: { exercise: WorkoutExercise; onLogSet: (set: number, reps: number | null, weight: number, durationSecs?: number) => void }) {
  const isTimed = !!exercise.duration_secs
  const [currentSet, setCurrentSet] = useState(1)
  const [reps, setReps] = useState(Number(exercise.reps) || 10)
  const [weight, setWeight] = useState(exercise.weight_lbs ?? 0)
  const [secs, setSecs] = useState(exercise.duration_secs ?? 45)
  const [countdown, setCountdown] = useState<number | null>(null)
  const adjust = (setter: any, val: number, amount: number, step = 1) => setter(Math.max(0, val + amount * step))

  useEffect(() => {
    if (countdown === null || countdown <= 0) return
    const id = setInterval(() => setCountdown(c => (c ?? 1) - 1), 1000)
    return () => clearInterval(id)
  }, [countdown])

  const handleLog = () => {
    if (isTimed) { onLogSet(currentSet, null, weight, secs) } else { onLogSet(currentSet, reps, weight) }
    setCurrentSet(c => c + 1)
    setCountdown(null)
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
        <h3 className="font-semibold text-lg text-slate-100">{exercise.name}</h3>
        <span className="text-slate-400 text-sm">Set {currentSet} of {exercise.sets || '?'}</span>
      </div>
      <div className={`grid gap-4 mb-6 ${isTimed ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {!isTimed && (
          <div className="bg-slate-900 rounded-lg p-2 text-center">
            <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Weight (lbs)</p>
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => adjust(setWeight, weight, -1, 5)} className="bg-slate-700 p-3 rounded-md active:bg-slate-600 flex-shrink-0"><Minus size={16} /></button>
              <input type="number" min="0" value={weight} onChange={e => setWeight(Math.max(0, Number(e.target.value)))}
                className="text-2xl font-bold w-full text-center bg-transparent focus:outline-none focus:bg-slate-800 rounded-md px-1" />
              <button onClick={() => adjust(setWeight, weight, 1, 5)} className="bg-slate-700 p-3 rounded-md active:bg-slate-600 flex-shrink-0"><Plus size={16} /></button>
            </div>
          </div>
        )}
        {isTimed ? (
          <div className="bg-slate-900 rounded-lg p-3 text-center">
            <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Seconds</p>
            <div className="flex items-center justify-between gap-2 mb-3">
              <button onClick={() => adjust(setSecs, secs, -1, 5)} className="bg-slate-700 p-3 rounded-md active:bg-slate-600 flex-shrink-0"><Minus size={16} /></button>
              <input type="number" min="1" value={secs} onChange={e => { setSecs(Math.max(1, Number(e.target.value))); setCountdown(null) }}
                className="text-3xl font-bold w-full text-center bg-transparent focus:outline-none focus:bg-slate-800 rounded-md px-1" />
              <button onClick={() => adjust(setSecs, secs, 1, 5)} className="bg-slate-700 p-3 rounded-md active:bg-slate-600 flex-shrink-0"><Plus size={16} /></button>
            </div>
            {countdown === null ? (
              <button onClick={() => setCountdown(secs)} className="w-full py-2 bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                <Timer size={15} /> Start Timer
              </button>
            ) : countdown === 0 ? (
              <div className="w-full py-2 bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-sm font-medium text-center animate-pulse">
                Time's up!
              </div>
            ) : (
              <div className="w-full py-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-200 rounded-lg text-sm font-medium text-center">
                <span className="text-2xl font-bold">{countdown}</span><span className="text-indigo-400 ml-1">s</span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-900 rounded-lg p-2 text-center">
            <p className="text-xs text-slate-400 mb-2 uppercase tracking-wider">Reps</p>
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => adjust(setReps, reps, -1)} className="bg-slate-700 p-3 rounded-md active:bg-slate-600 flex-shrink-0"><Minus size={16} /></button>
              <input type="number" min="0" value={reps} onChange={e => setReps(Math.max(0, Number(e.target.value)))}
                className="text-2xl font-bold w-full text-center bg-transparent focus:outline-none focus:bg-slate-800 rounded-md px-1" />
              <button onClick={() => adjust(setReps, reps, 1)} className="bg-slate-700 p-3 rounded-md active:bg-slate-600 flex-shrink-0"><Plus size={16} /></button>
            </div>
          </div>
        )}
      </div>
      <Button onClick={handleLog} className="w-full py-3">
        <CheckCircle size={18} className="mr-2" /> Log Set {currentSet}
      </Button>
    </Card>
  )
}
