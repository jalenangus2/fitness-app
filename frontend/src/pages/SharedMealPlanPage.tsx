import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Zap, Download, LogIn } from 'lucide-react'
import { useSharedMealPlan, useCreateMealPlan } from '../hooks/useMeal'
import { useAuthStore } from '../store/authStore'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Spinner from '../components/ui/Spinner'

const GOAL_COLORS: Record<string, 'green' | 'blue' | 'yellow' | 'red' | 'indigo' | 'slate'> = {
  weight_loss: 'blue', muscle_gain: 'green', maintenance: 'slate', keto: 'yellow', vegan: 'green',
}

export default function SharedMealPlanPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { token: authToken } = useAuthStore()
  const { data: plan, isLoading, isError } = useSharedMealPlan(token ?? '')
  const createPlan = useCreateMealPlan()
  const [imported, setImported] = useState(false)

  const handleImport = async () => {
    if (!plan) return
    await createPlan.mutateAsync({
      name: `${plan.name} (imported)`,
      goal: plan.goal,
      target_calories: plan.target_calories,
      target_protein_g: plan.target_protein_g,
      target_carbs_g: plan.target_carbs_g,
      target_fat_g: plan.target_fat_g,
      duration_days: plan.duration_days,
      is_ai_generated: false,
      meals: plan.meals.map(m => ({
        day_number: m.day_number,
        meal_type: m.meal_type,
        name: m.name,
        calories: m.calories,
        protein_g: m.protein_g,
        carbs_g: m.carbs_g,
        fat_g: m.fat_g,
        recipe_notes: m.recipe_notes,
        items: m.items.map(i => ({
          ingredient_name: i.ingredient_name,
          quantity: i.quantity,
          category: i.category,
        })),
      })),
    })
    setImported(true)
    setTimeout(() => navigate('/meal'), 1200)
  }

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

  const days = Array.from(new Set((plan.meals || []).map(m => m.day_number))).sort((a, b) => a - b)

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Shared Meal Plan</p>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center justify-center gap-2">
            {plan.name}
            {plan.is_ai_generated && <Zap size={20} className="text-yellow-400" />}
          </h1>
          <div className="flex items-center justify-center gap-2 flex-wrap mt-2">
            {plan.goal && <Badge variant={GOAL_COLORS[plan.goal] ?? 'slate'}>{plan.goal.replace('_', ' ')}</Badge>}
            {plan.target_calories && <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{plan.target_calories} kcal/day</span>}
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{plan.duration_days} days</span>
          </div>

          {/* Import button */}
          <div className="pt-3">
            {authToken ? (
              <button
                onClick={handleImport}
                disabled={createPlan.isPending || imported}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors"
              >
                {createPlan.isPending ? <Spinner size="sm" /> : <Download size={15} />}
                {imported ? 'Imported! Redirecting…' : createPlan.isPending ? 'Importing…' : 'Import to My Account'}
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-semibold text-slate-200 transition-colors"
              >
                <LogIn size={15} />
                Sign in to Import
              </button>
            )}
          </div>
        </div>

        {/* Macro targets */}
        {(plan.target_protein_g || plan.target_carbs_g || plan.target_fat_g) && (
          <Card className="bg-slate-800 border-slate-700">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Daily Targets</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div><p className="text-xl font-bold text-blue-400">{plan.target_protein_g}g</p><p className="text-xs text-slate-500">Protein</p></div>
              <div><p className="text-xl font-bold text-yellow-400">{plan.target_carbs_g}g</p><p className="text-xs text-slate-500">Carbs</p></div>
              <div><p className="text-xl font-bold text-rose-400">{plan.target_fat_g}g</p><p className="text-xs text-slate-500">Fat</p></div>
            </div>
          </Card>
        )}

        {/* Meals by day */}
        {days.map(day => (
          <div key={day}>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Day {day}</h2>
            <div className="space-y-3">
              {plan.meals.filter(m => m.day_number === day).map(meal => (
                <Card key={meal.id} className="bg-slate-800 border-slate-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{meal.meal_type}</span>
                    {meal.calories && <span className="text-xs text-slate-400">{meal.calories} kcal</span>}
                  </div>
                  <p className="text-sm font-medium text-slate-200">{meal.name}</p>
                  {(meal.protein_g || meal.carbs_g || meal.fat_g) && (
                    <p className="text-xs text-slate-500 mt-1">P: {meal.protein_g}g · C: {meal.carbs_g}g · F: {meal.fat_g}g</p>
                  )}
                  {meal.recipe_notes && <p className="text-xs text-slate-400 mt-2 italic">{meal.recipe_notes}</p>}
                  {meal.items && meal.items.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {meal.items.map((item, i) => (
                        <p key={i} className="text-xs text-slate-400">· {item.ingredient_name}{item.quantity ? ` — ${item.quantity}` : ''}</p>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        ))}

        <p className="text-center text-xs text-slate-600 pt-4">Shared via LifeOS Fitness</p>
      </div>
    </div>
  )
}
