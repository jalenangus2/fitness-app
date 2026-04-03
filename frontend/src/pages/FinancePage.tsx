import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  DollarSign, Plus, Trash2, RefreshCw, Building2, CreditCard,
  TrendingDown, Search, ChevronDown,
} from 'lucide-react'
import { usePlaidLink } from 'react-plaid-link'
import {
  useLinkToken, useExchangeToken, useAccounts, useDeleteAccount,
  useSyncTransactions, useTransactions, useUpdateTransactionCategory,
  useBudgets, useCreateBudget, useDeleteBudget, useFinanceSummary,
} from '../hooks/useFinance'
import { useToast } from '../components/ui/Toast'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'
import type { BudgetWithSpend, Transaction } from '../types'

const TABS = ['Overview', 'Transactions', 'Budgets'] as const
type Tab = typeof TABS[number]

const BUDGET_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

function fmt$(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

function categoryLabel(cat: string | null) {
  if (!cat) return 'Uncategorized'
  return cat.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Plaid Link button ────────────────────────────────────────────────────────
function ConnectBankButton() {
  const { data: linkData, isLoading: tokenLoading } = useLinkToken()
  const exchange = useExchangeToken()
  const { toast } = useToast()

  const { open, ready } = usePlaidLink({
    token: linkData?.link_token ?? null,
    onSuccess: async (public_token, metadata) => {
      try {
        const inst = metadata.institution ?? { name: 'Unknown Bank', institution_id: '' }
        await exchange.mutateAsync({
          public_token,
          institution_name: inst.name,
          institution_id: inst.institution_id ?? '',
        })
        toast('Bank connected and transactions synced!', 'success')
      } catch {
        toast('Failed to connect bank. Check Plaid credentials.', 'error')
      }
    },
  })

  return (
    <Button
      onClick={() => open()}
      disabled={!ready || tokenLoading || exchange.isPending}
      loading={exchange.isPending}
    >
      <Plus size={16} /> Connect Bank
    </Button>
  )
}

// ─── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data: summary, isLoading } = useFinanceSummary()
  const deleteAccount = useDeleteAccount()
  const sync = useSyncTransactions()
  const { toast } = useToast()

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>

  const maxCat = summary?.top_categories[0]?.amount ?? 1

  return (
    <div className="space-y-6">
      {/* Top stat row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-xs text-slate-400 mb-1">Net Worth (linked)</p>
          <p className={`text-2xl font-bold ${(summary?.total_balance ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {fmt$(summary?.total_balance ?? 0)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400 mb-1">Spent This Month</p>
          <p className="text-2xl font-bold text-slate-100">{fmt$(summary?.monthly_spend ?? 0)}</p>
        </Card>
        <Card>
          <p className="text-xs text-slate-400 mb-1">Linked Accounts</p>
          <p className="text-2xl font-bold text-slate-100">{summary?.accounts.length ?? 0}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accounts */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-100 flex items-center gap-2">
              <Building2 size={16} className="text-indigo-400" /> Accounts
            </h2>
            <div className="flex gap-2">
              <Button
                variant="ghost" size="sm"
                onClick={() => sync.mutateAsync().then(r => toast(`Synced: +${r.added} transactions`, 'success'))}
                loading={sync.isPending}
              >
                <RefreshCw size={14} /> Sync
              </Button>
              <ConnectBankButton />
            </div>
          </div>
          {!summary?.accounts.length ? (
            <div className="text-center py-10">
              <Building2 size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm mb-4">No accounts connected yet.</p>
              <ConnectBankButton />
              {!localStorage.getItem('plaid_configured') && (
                <p className="text-xs text-slate-500 mt-3">
                  Requires Plaid API keys in backend/.env
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {summary.accounts.map((acct) => (
                <div key={acct.id} className="flex items-center gap-3 p-3 bg-slate-700/40 rounded-lg">
                  <div className="w-9 h-9 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    {acct.type === 'credit' ? <CreditCard size={16} className="text-yellow-400" /> : <Building2 size={16} className="text-indigo-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">
                      {acct.institution_name} — {acct.name}
                      {acct.mask && <span className="text-slate-400"> ···{acct.mask}</span>}
                    </p>
                    <p className="text-xs text-slate-400 capitalize">{acct.subtype ?? acct.type}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold text-sm ${acct.type === 'credit' ? 'text-red-400' : 'text-green-400'}`}>
                      {fmt$(acct.current_balance ?? 0)}
                    </p>
                    {acct.available_balance != null && acct.type !== 'credit' && (
                      <p className="text-xs text-slate-500">{fmt$(acct.available_balance)} avail</p>
                    )}
                  </div>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => deleteAccount.mutateAsync(acct.id).then(() => toast('Account removed.', 'info'))}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top categories */}
        <Card>
          <h2 className="font-semibold text-slate-100 flex items-center gap-2 mb-4">
            <TrendingDown size={16} className="text-red-400" /> Top Spending This Month
          </h2>
          {!summary?.top_categories.length ? (
            <p className="text-slate-400 text-sm text-center py-8">No transactions this month.</p>
          ) : (
            <div className="space-y-3">
              {summary.top_categories.map((cat) => (
                <div key={cat.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300">{categoryLabel(cat.category)}</span>
                    <span className="text-slate-200 font-medium">{fmt$(cat.amount)}</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${Math.round((cat.amount / maxCat) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Budget snapshot */}
      {(summary?.budgets_with_spend.length ?? 0) > 0 && (
        <Card>
          <h2 className="font-semibold text-slate-100 mb-4">Budget Status</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary!.budgets_with_spend.map((b) => (
              <BudgetCard key={b.id} budget={b} compact />
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Transactions tab ─────────────────────────────────────────────────────────
function TransactionsTab() {
  const today = new Date()
  const [month, setMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  const { data: txns = [], isLoading } = useTransactions({
    month,
    search: search || undefined,
    category: categoryFilter || undefined,
  })
  const updateCategory = useUpdateTransactionCategory()
  const { toast } = useToast()

  const categories = Array.from(new Set(txns.map(t => t.custom_category || t.category).filter(Boolean))) as string[]

  const handleSaveCategory = async (txn: Transaction) => {
    await updateCategory.mutateAsync({ id: txn.id, category: editValue })
    toast('Category updated.', 'success')
    setEditingId(null)
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search transactions..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : txns.length === 0 ? (
        <Card className="text-center py-16">
          <DollarSign size={36} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No transactions found. Connect a bank account first.</p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="divide-y divide-slate-700">
            {txns.map((txn) => (
              <div key={txn.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-700/30 transition-colors">
                {txn.logo_url ? (
                  <img src={txn.logo_url} alt="" className="w-9 h-9 rounded-lg object-contain bg-white p-0.5 flex-shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-indigo-600/20 flex items-center justify-center flex-shrink-0 text-indigo-400 font-bold text-sm">
                    {(txn.merchant_name || txn.name)[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{txn.merchant_name || txn.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500">{format(parseISO(txn.date), 'MMM d')}</span>
                    <span className="text-xs text-slate-500">·</span>
                    <span className="text-xs text-slate-500">{txn.account_name}</span>
                    {txn.pending && <Badge variant="yellow">Pending</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {editingId === txn.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        className="bg-slate-700 border border-slate-500 rounded px-2 py-1 text-xs text-slate-100 w-36 focus:outline-none"
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveCategory(txn)}
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleSaveCategory(txn)} loading={updateCategory.isPending}>✓</Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>✕</Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingId(txn.id); setEditValue(txn.custom_category || txn.category || '') }}
                      className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                    >
                      {categoryLabel(txn.custom_category || txn.category)}
                    </button>
                  )}
                  <span className={`text-sm font-semibold min-w-[70px] text-right ${txn.amount < 0 ? 'text-green-400' : 'text-slate-100'}`}>
                    {txn.amount < 0 ? '+' : ''}{fmt$(Math.abs(txn.amount))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── Budgets tab ──────────────────────────────────────────────────────────────
function BudgetsTab() {
  const { data: budgets = [], isLoading } = useBudgets()
  const createBudget = useCreateBudget()
  const deleteBudget = useDeleteBudget()
  const { toast } = useToast()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ category: '', name: '', amount_cents: 0, color: BUDGET_COLORS[0] })
  const [amountDollars, setAmountDollars] = useState('')

  const handleCreate = async () => {
    if (!form.category || !form.name || !amountDollars) { toast('Fill in all fields.', 'error'); return }
    await createBudget.mutateAsync({ ...form, amount_cents: Math.round(parseFloat(amountDollars) * 100) })
    toast('Budget created!', 'success')
    setShowModal(false)
    setForm({ category: '', name: '', amount_cents: 0, color: BUDGET_COLORS[0] })
    setAmountDollars('')
  }

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setShowModal(true)}><Plus size={16} /> Add Budget</Button>
      </div>

      {budgets.length === 0 ? (
        <Card className="text-center py-16">
          <DollarSign size={36} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm mb-4">No budgets yet. Create one to track your spending.</p>
          <Button onClick={() => setShowModal(true)}><Plus size={16} /> Add Budget</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map(b => (
            <BudgetCard key={b.id} budget={b} onDelete={() => deleteBudget.mutateAsync(b.id).then(() => toast('Budget removed.', 'info'))} />
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Budget" size="sm">
        <div className="space-y-4">
          <Input label="Category (matches transaction category)" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="FOOD_AND_DRINK" />
          <Input label="Display Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Food & Drink" />
          <Input label="Monthly Limit ($)" type="number" step="0.01" value={amountDollars} onChange={e => setAmountDollars(e.target.value)} placeholder="500.00" />
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">Color</p>
            <div className="flex gap-2 flex-wrap">
              {BUDGET_COLORS.map(c => (
                <button key={c} onClick={() => setForm({ ...form, color: c })} className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} loading={createBudget.isPending} className="flex-1">Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function BudgetCard({ budget, compact, onDelete }: { budget: BudgetWithSpend; compact?: boolean; onDelete?: () => void }) {
  const over = budget.percent_used >= 90
  const spent = budget.spent_cents / 100
  const limit = budget.amount_cents / 100

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: budget.color }} />
            <p className="font-medium text-slate-200 text-sm">{budget.name}</p>
          </div>
          {!compact && <p className="text-xs text-slate-500 mt-0.5">{categoryLabel(budget.category)}</p>}
        </div>
        {onDelete && (
          <button onClick={onDelete} className="text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
        )}
      </div>
      <div className="flex justify-between text-sm mb-2">
        <span className={over ? 'text-red-400 font-semibold' : 'text-slate-300'}>{fmt$(spent)}</span>
        <span className="text-slate-400">/ {fmt$(limit)}</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : 'bg-indigo-500'}`}
          style={{ width: `${Math.min(budget.percent_used, 100)}%`, backgroundColor: budget.percent_used < 90 ? budget.color : undefined }}
        />
      </div>
      <p className={`text-xs mt-1.5 ${over ? 'text-red-400' : 'text-slate-400'}`}>
        {budget.percent_used.toFixed(0)}% used
        {over && budget.spent_cents > budget.amount_cents && ` · ${fmt$((budget.spent_cents - budget.amount_cents) / 100)} over`}
      </p>
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function FinancePage() {
  const [tab, setTab] = useState<Tab>('Overview')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Finances</h1>
        <p className="text-slate-400 mt-1">Track spending, budgets, and connected bank accounts.</p>
      </div>

      <div className="flex gap-1 border-b border-slate-700">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
              tab === t ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && <OverviewTab />}
      {tab === 'Transactions' && <TransactionsTab />}
      {tab === 'Budgets' && <BudgetsTab />}
    </div>
  )
}
