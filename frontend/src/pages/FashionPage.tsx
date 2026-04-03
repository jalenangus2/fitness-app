import { useState } from 'react'
import { Plus, Trash2, Bell, BellOff, ExternalLink, Shirt } from 'lucide-react'
import { useFashionReleases, useCreateFashionRelease, useDeleteFashionRelease, useToggleFashionAlert } from '../hooks/useFashion'
import { useToast } from '../components/ui/Toast'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Spinner from '../components/ui/Spinner'
import { formatDate, daysUntil } from '../utils/date'
import type { FashionRelease } from '../types'

const CATEGORY_OPTIONS = [
  { value: 'sneakers', label: 'Sneakers' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'other', label: 'Other' },
]

const CATEGORY_FILTERS = ['All', 'Sneakers', 'Clothing', 'Accessories', 'Other']

function CountdownBadge({ releaseDate }: { releaseDate: string }) {
  const days = daysUntil(releaseDate)
  if (days < 0) return <Badge variant="slate">Released</Badge>
  if (days === 0) return <Badge variant="red">Today!</Badge>
  if (days === 1) return <Badge variant="red">Tomorrow</Badge>
  if (days <= 7) return <Badge variant="yellow">{days} days</Badge>
  return <Badge variant="green">{days} days</Badge>
}

export default function FashionPage() {
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [upcomingOnly, setUpcomingOnly] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const { toast } = useToast()

  const params = {
    category: categoryFilter !== 'All' ? categoryFilter.toLowerCase() : undefined,
    upcoming: upcomingOnly || undefined,
  }

  const { data: releases = [], isLoading } = useFashionReleases(params)
  const createRelease = useCreateFashionRelease()
  const deleteRelease = useDeleteFashionRelease()
  const toggleAlert = useToggleFashionAlert()

  const [form, setForm] = useState({
    brand: '', name: '', category: 'sneakers', release_date: '',
    price_cents: '' as string | number, colorway: '', sku: '', image_url: '', retailer_url: '', notes: '',
  })

  const handleCreate = async () => {
    if (!form.brand || !form.name || !form.release_date) {
      toast('Brand, name, and release date are required.', 'error')
      return
    }
    await createRelease.mutateAsync({
      ...form,
      price_cents: form.price_cents ? Math.round(Number(form.price_cents) * 100) : undefined,
    })
    toast('Release added!', 'success')
    setShowModal(false)
    setForm({ brand: '', name: '', category: 'sneakers', release_date: '', price_cents: '', colorway: '', sku: '', image_url: '', retailer_url: '', notes: '' })
  }

  const handleToggleAlert = async (release: FashionRelease) => {
    await toggleAlert.mutateAsync({ release })
    toast(release.alerts.length > 0 ? 'Alert removed.' : 'Alert set for 1 day before!', 'success')
  }

  if (isLoading) return <div className="flex justify-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Fashion Tracker</h1>
          <p className="text-slate-400 mt-1">Track sneaker drops and clothing releases.</p>
        </div>
        <Button onClick={() => setShowModal(true)}><Plus size={16} /> Add Release</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {CATEGORY_FILTERS.map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
              categoryFilter === c
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            {c}
          </button>
        ))}
        <button
          onClick={() => setUpcomingOnly(!upcomingOnly)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ml-2 ${
            upcomingOnly
              ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
          }`}
        >
          Upcoming Only
        </button>
      </div>

      {releases.length === 0 ? (
        <Card className="text-center py-16">
          <Shirt size={40} className="text-slate-600 mx-auto mb-4" />
          <h3 className="text-slate-300 font-medium mb-2">No releases tracked</h3>
          <p className="text-slate-500 text-sm mb-6">Add upcoming sneaker and clothing drops you want to cop.</p>
          <Button onClick={() => setShowModal(true)}><Plus size={16} /> Add Your First Release</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {releases.map((r) => (
            <ReleaseCard
              key={r.id}
              release={r}
              onDelete={() => deleteRelease.mutateAsync(r.id).then(() => toast('Deleted.', 'info'))}
              onToggleAlert={() => handleToggleAlert(r)}
            />
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Fashion Release" size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Brand *" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="Nike" />
            <Input label="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Air Jordan 1 Retro High OG" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" options={CATEGORY_OPTIONS} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <Input label="Release Date *" type="date" value={form.release_date} onChange={(e) => setForm({ ...form, release_date: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Retail Price ($)" type="number" step="0.01" value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: e.target.value })} placeholder="180.00" />
            <Input label="Colorway" value={form.colorway} onChange={(e) => setForm({ ...form, colorway: e.target.value })} placeholder="University Blue" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="555088-134" />
            <Input label="Image URL" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
          </div>
          <Input label="Retailer URL" value={form.retailer_url} onChange={(e) => setForm({ ...form, retailer_url: e.target.value })} placeholder="https://www.nike.com/..." />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Limited release, size run true to size" />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} loading={createRelease.isPending} className="flex-1">Add Release</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ReleaseCard({ release, onDelete, onToggleAlert }: {
  release: FashionRelease
  onDelete: () => void
  onToggleAlert: () => void
}) {
  const hasAlert = release.alerts.length > 0
  const days = daysUntil(release.release_date)

  return (
    <Card className="flex flex-col">
      {release.image_url ? (
        <img src={release.image_url} alt={release.name} className="w-full h-40 object-contain bg-white rounded-lg mb-3" />
      ) : (
        <div className="w-full h-40 bg-slate-700 rounded-lg mb-3 flex items-center justify-center">
          <Shirt size={32} className="text-slate-500" />
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{release.brand}</p>
          <h3 className="font-semibold text-slate-100 text-sm mt-0.5 leading-snug">{release.name}</h3>
          {release.colorway && <p className="text-xs text-slate-500 mt-0.5">{release.colorway}</p>}
        </div>
        <CountdownBadge releaseDate={release.release_date} />
      </div>

      <div className="flex items-center gap-2 mt-auto pt-3 border-t border-slate-700">
        <div className="flex-1">
          <p className="text-xs text-slate-400">{formatDate(release.release_date)}</p>
          {release.price_cents && (
            <p className="text-sm font-semibold text-green-400">${(release.price_cents / 100).toFixed(2)}</p>
          )}
        </div>
        <Badge variant={release.category === 'sneakers' ? 'indigo' : release.category === 'clothing' ? 'blue' : 'slate'}>
          {release.category}
        </Badge>
        {release.retailer_url && (
          <a href={release.retailer_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-indigo-400">
            <ExternalLink size={15} />
          </a>
        )}
        <button
          onClick={onToggleAlert}
          title={hasAlert ? 'Remove alert' : 'Set alert (1 day before)'}
          className={`transition-colors ${hasAlert ? 'text-yellow-400 hover:text-yellow-300' : 'text-slate-500 hover:text-yellow-400'}`}
          disabled={days < 0}
        >
          {hasAlert ? <Bell size={16} /> : <BellOff size={16} />}
        </button>
        <button onClick={onDelete} className="text-slate-500 hover:text-red-400 transition-colors">
          <Trash2 size={15} />
        </button>
      </div>
    </Card>
  )
}
