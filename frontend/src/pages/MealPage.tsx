import { useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Plus, Zap, CheckCircle, Trash2, ChevronDown, ShoppingCart, Search, Pencil } from 'lucide-react'
import { useMealPlans, useCreateMealPlan, useUpdateMealPlan, useActivateMealPlan, useDeleteMealPlan, useDailyNutrition, useLogNutrition, useSearchFoods, useNutritionHistory } from '../hooks/useMeal'
import { useCreateShoppingList } from '../hooks/useShopping'
import { useToast } from '../components/ui/Toast'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Select from '../components/ui/Select'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'

const GOAL_OPTIONS = [{ value: 'weight_loss', label: 'Weight Loss' }, { value: 'muscle_gain', label: 'Muscle Gain' }, { value: 'maintenance', label: 'Maintenance' }, { value: 'keto', label: 'Keto' }, { value: 'vegan', label: 'Vegan' }]
const GOAL_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'indigo' | 'slate'> = { weight_loss: 'blue', muscle_gain: 'green', maintenance: 'slate', keto: 'yellow', vegan: 'green' }

export default function MealPage() {
  const { data: plans = [], isLoading } = useMealPlans()
  const { data: logs = [] } = useDailyNutrition()
  const createManual = useCreateMealPlan()
  const updatePlan = useUpdateMealPlan()
  const activate = useActivateMealPlan()
  const remove = useDeleteMealPlan()
  const createList = useCreateShoppingList()
  const logNutrients = useLogNutrition()
  const { data: historyLogs = [] } = useNutritionHistory(30)
  const { toast } = useToast()

  // UI State
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)
  const [showGoalsModal, setShowGoalsModal] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [expandedDay, setExpandedDay] = useState<number>(1)

  // Forms
  const [form, setForm] = useState({ name: '', goal: 'muscle_gain', target_calories: 2500, target_protein_g: 180, target_carbs_g: 250, target_fat_g: 80, duration_days: 7 })
  const [logForm, setLogForm] = useState({ name: '', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })
  const [goalsForm, setGoalsForm] = useState({ target_calories: 2000, target_protein_g: 150, target_carbs_g: 200, target_fat_g: 65 })
  const [foodSearch, setFoodSearch] = useState('')
  const { data: foodResults = [] } = useSearchFoods(foodSearch)

  const activePlan = plans.find(p => p.is_active)
  
  // Macro Calculations
  const dailyTargets = useMemo(() => activePlan ? {
    cals: activePlan.target_calories || 2000,
    prot: activePlan.target_protein_g || 150,
    carb: activePlan.target_carbs_g || 200,
    fat: activePlan.target_fat_g || 65
  } : { cals: 2000, prot: 150, carb: 200, fat: 65 }, [activePlan])

  const dailyTotals = useMemo(() => logs.reduce((acc, log) => ({
    cals: acc.cals + log.calories,
    prot: acc.prot + log.protein_g,
    carb: acc.carb + log.carbs_g,
    fat: acc.fat + log.fat_g
  }), { cals: 0, prot: 0, carb: 0, fat: 0 }), [logs])

  const openGoalsModal = () => {
    setGoalsForm({
      target_calories: dailyTargets.cals,
      target_protein_g: dailyTargets.prot,
      target_carbs_g: dailyTargets.carb,
      target_fat_g: dailyTargets.fat,
    })
    setShowGoalsModal(true)
  }

  const handleSaveGoals = async () => {
    try {
      if (activePlan) {
        await updatePlan.mutateAsync({ id: activePlan.id!, data: goalsForm })
      } else {
        await createManual.mutateAsync({ name: 'My Goals', goal: 'maintenance', ...goalsForm, duration_days: 365, is_ai_generated: false, meals: [] })
      }
      toast('Goals saved!', 'success')
      setShowGoalsModal(false)
    } catch {
      toast('Failed to save goals.', 'error')
    }
  }

  const historyByDate = useMemo(() => {
    const groups: Record<string, typeof historyLogs> = {}
    historyLogs.forEach(log => {
      const day = log.consumed_at ? format(parseISO(log.consumed_at), 'yyyy-MM-dd') : 'Today'
      if (!groups[day]) groups[day] = []
      groups[day].push(log)
    })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [historyLogs])

  const handleCreatePlan = async () => {
    try {
      await createManual.mutateAsync({ ...form, is_ai_generated: false, meals: [] })
      toast('Meal plan created!', 'success')
      setShowPlanModal(false)
    } catch {
      toast('Failed to create plan. Please try again.', 'error')
    }
  }

  const handleLogNutrition = async () => {
    if (!logForm.name || logForm.calories <= 0) return toast('Please enter a valid food name and calories.', 'error')
    try {
      await logNutrients.mutateAsync(logForm)
      toast('Food logged!', 'success')
      setShowLogModal(false)
      setLogForm({ name: '', calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })
    } catch {
      toast('Failed to log food. Please try again.', 'error')
    }
  }

  if (isLoading) return <div className="flex justify-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6 pb-20">
      
      {/* MACRO DASHBOARD */}
      <Card className="bg-slate-800 border-slate-700">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-slate-100">Today's Nutrition</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={openGoalsModal}><Pencil size={14} /></Button>
            <Button size="sm" onClick={() => setShowLogModal(true)}><Plus size={14} className="mr-1"/> Quick Add</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MacroRing label="Calories" current={Math.round(dailyTotals.cals)} target={dailyTargets.cals} unit="k cal" color="#10b981" />
          <MacroRing label="Protein" current={Math.round(dailyTotals.prot)} target={dailyTargets.prot} unit="g" color="#3b82f6" />
          <MacroRing label="Carbs" current={Math.round(dailyTotals.carb)} target={dailyTargets.carb} unit="g" color="#f59e0b" />
          <MacroRing label="Fats" current={Math.round(dailyTotals.fat)} target={dailyTargets.fat} unit="g" color="#f43f5e" />
        </div>
      </Card>

      {/* PLANNER SECTION */}
      <div className="flex items-center justify-between mt-8">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Meal Plans</h1>
        </div>
        <Button onClick={() => setShowPlanModal(true)} variant="secondary" size="sm"><Plus size={16} /> New Plan</Button>
      </div>

      <div className="space-y-4">
        {plans.map((plan) => (
          <MealPlanCard
            key={plan.id} plan={plan} expanded={expandedId === plan.id} expandedDay={expandedDay}
            onToggle={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
            onDayChange={setExpandedDay}
            onActivate={() => activate.mutateAsync(plan.id!).then(() => toast('Meal plan activated!', 'success'))}
            onDelete={() => remove.mutateAsync(plan.id!).then(() => toast('Meal plan deleted.', 'info'))}
            onCreateShoppingList={() => createList.mutateAsync({ name: `${plan.name} Shopping List`, meal_plan_id: plan.id }).then(() => toast('Shopping List created!', 'success'))}
          />
        ))}
      </div>

      {/* FOOD LOG HISTORY */}
      {historyByDate.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-slate-100 mb-4">Food Log History</h2>
          <div className="space-y-4">
            {historyByDate.map(([dateKey, logs]) => {
              const dayTotal = logs.reduce((acc, l) => ({ cals: acc.cals + l.calories, prot: acc.prot + l.protein_g, carb: acc.carb + l.carbs_g, fat: acc.fat + l.fat_g }), { cals: 0, prot: 0, carb: 0, fat: 0 })
              const label = format(new Date(dateKey + 'T12:00:00'), 'EEEE, MMM d')
              return (
                <Card key={dateKey} className="bg-slate-800 border-slate-700">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-semibold text-slate-200">{label}</p>
                    <p className="text-xs text-slate-500">{Math.round(dayTotal.cals)} k cal</p>
                  </div>
                  <div className="space-y-2">
                    {logs.map((log, i) => (
                      <div key={i} className="flex justify-between items-center text-xs bg-slate-900 rounded px-3 py-2">
                        <span className="text-slate-300">{log.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">{log.calories} k cal · P:{log.protein_g}g · C:{log.carbs_g}g · F:{log.fat_g}g</span>
                          <button
                            onClick={() => logNutrients.mutateAsync({ name: log.name, calories: log.calories, protein_g: log.protein_g, carbs_g: log.carbs_g, fat_g: log.fat_g }).then(() => toast('Re-added!', 'success'))}
                            className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition-colors"
                            title="Re-add today"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-500">
                    <span>P: <span className="text-blue-400">{Math.round(dayTotal.prot)}g</span></span>
                    <span>C: <span className="text-yellow-400">{Math.round(dayTotal.carb)}g</span></span>
                    <span>F: <span className="text-rose-400">{Math.round(dayTotal.fat)}g</span></span>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* QUICK ADD LOG MODAL */}
      <Modal isOpen={showLogModal} onClose={() => { setShowLogModal(false); setFoodSearch('') }} title="Log Food">
        <div className="space-y-4">
          <div className="relative">
            <Input
              label="Search Food"
              value={foodSearch || logForm.name}
              onChange={e => {
                setFoodSearch(e.target.value)
                setLogForm(f => ({ ...f, name: e.target.value }))
              }}
              placeholder="e.g. Chicken Breast"
              autoFocus
            />
            <Search className="absolute right-3 top-9 text-slate-500 pointer-events-none" size={16} />
            {foodResults.length > 0 && foodSearch.length > 2 && (
              <ul className="absolute z-10 left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {foodResults.map(food => (
                  <li
                    key={food.id}
                    className="px-3 py-2 cursor-pointer hover:bg-slate-700 border-b border-slate-700/50 last:border-0"
                    onClick={() => {
                      setLogForm({ name: food.name, calories: food.calories, protein_g: food.protein_g, carbs_g: food.carbs_g, fat_g: food.fat_g })
                      setFoodSearch('')
                    }}
                  >
                    <p className="text-sm text-slate-200">{food.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{food.calories} kcal · P:{food.protein_g}g · C:{food.carbs_g}g · F:{food.fat_g}g</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Calories" type="number" value={logForm.calories} onChange={e => setLogForm({...logForm, calories: Number(e.target.value)})} />
            <Input label="Protein (g)" type="number" value={logForm.protein_g} onChange={e => setLogForm({...logForm, protein_g: Number(e.target.value)})} />
            <Input label="Carbs (g)" type="number" value={logForm.carbs_g} onChange={e => setLogForm({...logForm, carbs_g: Number(e.target.value)})} />
            <Input label="Fat (g)" type="number" value={logForm.fat_g} onChange={e => setLogForm({...logForm, fat_g: Number(e.target.value)})} />
          </div>
          <Button onClick={handleLogNutrition} className="w-full">Log Nutrition</Button>
        </div>
      </Modal>

      {/* CREATE PLAN MODAL */}
      <Modal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} title="Create Meal Plan" size="lg">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
          <Input label="Plan Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Bulk Week 1" />
          <Select label="Goal" options={GOAL_OPTIONS} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Daily Calories" type="number" min={1000} value={form.target_calories} onChange={(e) => setForm({ ...form, target_calories: Number(e.target.value) })} />
            <Input label="Duration (days)" type="number" min={1} max={14} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Protein (g)" type="number" min={0} value={form.target_protein_g} onChange={(e) => setForm({ ...form, target_protein_g: Number(e.target.value) })} />
            <Input label="Carbs (g)" type="number" min={0} value={form.target_carbs_g} onChange={(e) => setForm({ ...form, target_carbs_g: Number(e.target.value) })} />
            <Input label="Fat (g)" type="number" min={0} value={form.target_fat_g} onChange={(e) => setForm({ ...form, target_fat_g: Number(e.target.value) })} />
          </div>
        </div>
        <div className="flex gap-3 pt-4 mt-4 border-t border-slate-700">
          <Button variant="secondary" onClick={() => setShowPlanModal(false)} className="flex-1">Cancel</Button>
          <Button onClick={handleCreatePlan} className="flex-1">Save Plan</Button>
        </div>
      </Modal>

      {/* EDIT NUTRITION GOALS MODAL */}
      <Modal isOpen={showGoalsModal} onClose={() => setShowGoalsModal(false)} title="Daily Nutrition Goals">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">{activePlan ? `Updates targets for "${activePlan.name}"` : 'Creates a "My Goals" plan and sets it active'}</p>
          <Input label="Daily Calories (k cal)" type="number" min={500} value={goalsForm.target_calories} onChange={e => setGoalsForm(f => ({ ...f, target_calories: Number(e.target.value) }))} />
          <div className="grid grid-cols-3 gap-3">
            <Input label="Protein (g)" type="number" min={0} value={goalsForm.target_protein_g} onChange={e => setGoalsForm(f => ({ ...f, target_protein_g: Number(e.target.value) }))} />
            <Input label="Carbs (g)" type="number" min={0} value={goalsForm.target_carbs_g} onChange={e => setGoalsForm(f => ({ ...f, target_carbs_g: Number(e.target.value) }))} />
            <Input label="Fat (g)" type="number" min={0} value={goalsForm.target_fat_g} onChange={e => setGoalsForm(f => ({ ...f, target_fat_g: Number(e.target.value) }))} />
          </div>
        </div>
        <div className="flex gap-3 pt-4 mt-4 border-t border-slate-700">
          <Button variant="secondary" onClick={() => setShowGoalsModal(false)} className="flex-1">Cancel</Button>
          <Button onClick={handleSaveGoals} className="flex-1">Save Goals</Button>
        </div>
      </Modal>
    </div>
  )
}

// --- SUB-COMPONENTS ---
const CIRCUMFERENCE = 2 * Math.PI * 40 // r=40

function MacroRing({ label, current, target, unit, color }: { label: string; current: number; target: number; unit: string; color: string }) {
  const pct = target > 0 ? Math.min(1, current / target) : 0
  const dash = pct * CIRCUMFERENCE
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="10" />
          <circle
            cx="50" cy="50" r="40" fill="none"
            stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-slate-100 leading-none">{current}</span>
          <span className="text-[10px] text-slate-500 leading-none">{unit}</span>
        </div>
      </div>
      <p className="text-xs text-slate-400 font-medium">{label}</p>
      <p className="text-[10px] text-slate-600">{target}{unit}</p>
    </div>
  )
}

function MealPlanCard({ plan, expanded, expandedDay, onToggle, onDayChange, onActivate, onDelete, onCreateShoppingList }: any) {
  const days = Array.from(new Set((plan.meals || []).map((m: any) => m.day_number))).sort((a: any, b: any) => a - b)

  return (
    <Card className={plan.is_active ? 'border-green-500/50 shadow-md shadow-green-500/10' : ''}>
      <div className="flex items-start justify-between">
        <div className="flex-1" onClick={onToggle}>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-100">{plan.name}</h3>
            {plan.is_ai_generated && <Zap size={12} className="text-yellow-400" />}
          </div>
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {plan.is_active && <Badge variant="green">Active</Badge>}
            <Badge variant={GOAL_COLORS[plan.goal] ?? 'slate'}>{plan.goal.replace('_', ' ')}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onCreateShoppingList}><ShoppingCart size={14} /></Button>
          {!plan.is_active && <Button variant="ghost" size="sm" onClick={onActivate}><CheckCircle size={15} /> Set Active</Button>}
          <button onClick={onToggle} className="p-2 text-slate-400"><ChevronDown size={18} className={expanded ? "rotate-180 transition-transform" : "transition-transform"} /></button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-slate-700 pt-4">
           {days.length > 0 ? (
             <>
              <div className="flex gap-1 mb-4 overflow-x-auto pb-2 hide-scrollbar">
                {days.map((d: any) => (
                  <button key={d} onClick={() => onDayChange(d)} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all border ${expandedDay === d ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>Day {d}</button>
                ))}
              </div>
              <div className="space-y-3">
                {plan.meals.filter((m: any) => m.day_number === expandedDay).map((meal: any) => (
                  <div key={meal.id} className="bg-slate-900 border border-slate-700/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{meal.meal_type}</span>
                      <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300">{meal.calories} kcal</span>
                    </div>
                    <p className="text-sm font-medium text-slate-200 mt-1">{meal.name}</p>
                    <p className="text-xs text-slate-500 mt-1">P: {meal.protein_g}g · C: {meal.carbs_g}g · F: {meal.fat_g}g</p>
                  </div>
                ))}
              </div>
             </>
           ) : (
             <p className="text-sm text-slate-500 text-center py-4">No meals added to this plan yet.</p>
           )}
           <div className="flex justify-end mt-4">
             <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-400 bg-red-500/10"><Trash2 size={14} className="mr-1"/> Delete Plan</Button>
           </div>
        </div>
      )}
    </Card>
  )
}