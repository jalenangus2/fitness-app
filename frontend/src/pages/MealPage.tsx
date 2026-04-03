import { useState } from 'react'
import { Plus, Zap, CheckCircle, Trash2, ChevronDown, ChevronUp, UtensilsCrossed, ShoppingCart } from 'lucide-react'
import { useMealPlans, useGenerateMealPlan, useActivateMealPlan, useDeleteMealPlan } from '../hooks/useMeal'
import { useCreateShoppingList } from '../hooks/useShopping'
import { useToast } from '../components/ui/Toast'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Select from '../components/ui/Select'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'
import type { MealPlan } from '../types'

const GOAL_OPTIONS = [
  { value: 'weight_loss', label: 'Weight Loss' },
  { value: 'muscle_gain', label: 'Muscle Gain' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'keto', label: 'Keto' },
  { value: 'vegan', label: 'Vegan' },
]

const RESTRICTION_OPTIONS = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Halal', 'Kosher']

const GOAL_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'indigo' | 'slate'> = {
  weight_loss: 'blue',
  muscle_gain: 'green',
  maintenance: 'slate',
  keto: 'yellow',
  vegan: 'green',
}

export default function MealPage() {
  const { data: plans = [], isLoading } = useMealPlans()
  const generate = useGenerateMealPlan()
  const activate = useActivateMealPlan()
  const remove = useDeleteMealPlan()
  const createList = useCreateShoppingList()
  const { toast } = useToast()
  const [showModal, setShowModal] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [expandedDay, setExpandedDay] = useState<number>(1)
  const [form, setForm] = useState({
    goal: 'muscle_gain',
    target_calories: 2500,
    target_protein_g: 180,
    target_carbs_g: 250,
    target_fat_g: 80,
    duration_days: 7,
    dietary_restrictions: [] as string[],
  })

  const toggleRestriction = (r: string) => {
    setForm((f) => ({
      ...f,
      dietary_restrictions: f.dietary_restrictions.includes(r)
        ? f.dietary_restrictions.filter((x) => x !== r)
        : [...f.dietary_restrictions, r],
    }))
  }

  const handleGenerate = async () => {
    try {
      await generate.mutateAsync({ ...form, dietary_restrictions: form.dietary_restrictions.map((r) => r.toLowerCase()) })
      toast('Meal plan generated!', 'success')
      setShowModal(false)
    } catch {
      toast('Failed to generate meal plan. Check your API key.', 'error')
    }
  }

  const handleCreateShoppingList = async (plan: MealPlan) => {
    try {
      await createList.mutateAsync({ name: `${plan.name} Shopping List`, meal_plan_id: plan.id })
      toast('Shopping list created! Check the Shopping page.', 'success')
    } catch {
      toast('Failed to create shopping list.', 'error')
    }
  }

  if (isLoading) return <div className="flex justify-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Meal Planner</h1>
          <p className="text-slate-400 mt-1">AI-generated meal plans matched to your goals.</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} /> Generate Plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <Card className="text-center py-16">
          <UtensilsCrossed size={40} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-slate-300 font-medium mb-2">No meal plans yet</h3>
          <p className="text-slate-500 text-sm mb-6">Generate a personalized meal plan with AI.</p>
          <Button onClick={() => setShowModal(true)}><Plus size={16} /> Generate Your First Plan</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <MealPlanCard
              key={plan.id}
              plan={plan}
              expanded={expandedId === plan.id}
              expandedDay={expandedDay}
              onToggle={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
              onDayChange={setExpandedDay}
              onActivate={() => activate.mutateAsync(plan.id).then(() => toast('Meal plan activated!', 'success'))}
              onDelete={() => remove.mutateAsync(plan.id).then(() => toast('Meal plan deleted.', 'info'))}
              onCreateShoppingList={() => handleCreateShoppingList(plan)}
            />
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Generate AI Meal Plan" size="lg">
        <div className="space-y-5">
          <Select label="Goal" options={GOAL_OPTIONS} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Daily Calories" type="number" min={1000} max={5000} value={form.target_calories} onChange={(e) => setForm({ ...form, target_calories: Number(e.target.value) })} />
            <Input label="Duration (days)" type="number" min={1} max={14} value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Protein (g)" type="number" min={0} value={form.target_protein_g} onChange={(e) => setForm({ ...form, target_protein_g: Number(e.target.value) })} />
            <Input label="Carbs (g)" type="number" min={0} value={form.target_carbs_g} onChange={(e) => setForm({ ...form, target_carbs_g: Number(e.target.value) })} />
            <Input label="Fat (g)" type="number" min={0} value={form.target_fat_g} onChange={(e) => setForm({ ...form, target_fat_g: Number(e.target.value) })} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">Dietary Restrictions</p>
            <div className="flex flex-wrap gap-2">
              {RESTRICTION_OPTIONS.map((r) => (
                <button key={r} onClick={() => toggleRestriction(r)} className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${form.dietary_restrictions.includes(r) ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'}`}>{r}</button>
              ))}
            </div>
          </div>
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

function MealPlanCard({ plan, expanded, expandedDay, onToggle, onDayChange, onActivate, onDelete, onCreateShoppingList }: {
  plan: MealPlan; expanded: boolean; expandedDay: number
  onToggle: () => void; onDayChange: (d: number) => void
  onActivate: () => void; onDelete: () => void; onCreateShoppingList: () => void
}) {
  const days = Array.from(new Set(plan.meals.map((m) => m.day_number))).sort((a, b) => a - b)

  return (
    <Card className={plan.is_active ? 'border-green-500/50' : ''}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-100">{plan.name}</h3>
            {plan.is_active && <Badge variant="green">Active</Badge>}
            <Badge variant={GOAL_COLORS[plan.goal] ?? 'slate'}>{plan.goal.replace('_', ' ')}</Badge>
            <Badge variant="slate">{plan.duration_days} days</Badge>
          </div>
          {(plan.target_calories || plan.target_protein_g) && (
            <p className="text-xs text-slate-400 mt-1">
              {plan.target_calories} kcal · {plan.target_protein_g}g protein · {plan.target_carbs_g}g carbs · {plan.target_fat_g}g fat
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button variant="ghost" size="sm" onClick={onCreateShoppingList}><ShoppingCart size={14} /></Button>
          {!plan.is_active && <Button variant="ghost" size="sm" onClick={onActivate}><CheckCircle size={15} /> Activate</Button>}
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-400 hover:text-red-300 hover:bg-red-500/10"><Trash2 size={15} /></Button>
          <button onClick={onToggle} className="text-slate-400 hover:text-slate-100 p-1">{expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-slate-700 pt-4">
          <div className="flex gap-1 mb-4 flex-wrap">
            {days.map((d) => (
              <button key={d} onClick={() => onDayChange(d)} className={`px-3 py-1 rounded-lg text-sm transition-all ${expandedDay === d ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>Day {d}</button>
            ))}
          </div>
          <div className="space-y-3">
            {plan.meals.filter((m) => m.day_number === expandedDay).map((meal) => (
              <div key={meal.id} className="bg-slate-700/40 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-indigo-400 uppercase tracking-wide">{meal.meal_type}</span>
                  <span className="text-xs text-slate-400">{meal.calories} kcal</span>
                </div>
                <p className="text-sm font-medium text-slate-200">{meal.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">P: {meal.protein_g}g · C: {meal.carbs_g}g · F: {meal.fat_g}g</p>
                {meal.recipe_notes && <p className="text-xs text-slate-500 mt-1 italic">{meal.recipe_notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
