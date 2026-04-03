import { useState } from 'react'
import { Plus, Trash2, ShoppingCart, ExternalLink, Search, X, CheckSquare, Square } from 'lucide-react'
import { useShoppingLists, useShoppingList, useCreateShoppingList, useDeleteShoppingList, useAddShoppingItem, useUpdateShoppingItem, useDeleteShoppingItem, useWalmartSearch, useWalmartSelect } from '../hooks/useShopping'
import { useToast } from '../components/ui/Toast'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'
import type { WalmartProduct, ShoppingListItem } from '../types'

const CATEGORIES = ['produce', 'protein', 'dairy', 'pantry', 'frozen', 'beverages', 'other']

function groupByCategory(items: ShoppingListItem[]) {
  const groups: Record<string, ShoppingListItem[]> = {}
  for (const item of items) {
    const cat = item.category || 'other'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(item)
  }
  return groups
}

export default function ShoppingPage() {
  const { data: lists = [], isLoading } = useShoppingLists()
  const createList = useCreateShoppingList()
  const deleteList = useDeleteShoppingList()
  const { toast } = useToast()
  const [selectedListId, setSelectedListId] = useState<number | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newListName, setNewListName] = useState('')

  const handleCreate = async () => {
    if (!newListName.trim()) return
    const list = await createList.mutateAsync({ name: newListName })
    toast('Shopping list created!', 'success')
    setShowCreateModal(false)
    setNewListName('')
    setSelectedListId(list.id)
  }

  const handleDelete = async (id: number) => {
    await deleteList.mutateAsync(id)
    if (selectedListId === id) setSelectedListId(null)
    toast('List deleted.', 'info')
  }

  if (isLoading) return <div className="flex justify-center h-64"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Shopping Lists</h1>
          <p className="text-slate-400 mt-1">Manage grocery lists with Walmart price lookup.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}><Plus size={16} /> New List</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List panel */}
        <div className="space-y-3">
          {lists.length === 0 ? (
            <Card className="text-center py-10">
              <ShoppingCart size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No shopping lists yet.</p>
            </Card>
          ) : (
            lists.map((list) => (
              <Card
                key={list.id}
                onClick={() => setSelectedListId(list.id)}
                className={selectedListId === list.id ? 'border-indigo-500/60 bg-slate-700/50' : ''}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-200">{list.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{list.items.length} items</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(list.id) }} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selectedListId ? (
            <ListDetail listId={selectedListId} />
          ) : (
            <Card className="text-center py-16">
              <ShoppingCart size={36} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Select a list to view items</p>
            </Card>
          )}
        </div>
      </div>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Shopping List" size="sm">
        <div className="space-y-4">
          <Input label="List Name" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="Weekly Groceries" autoFocus />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} loading={createList.isPending} className="flex-1">Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ListDetail({ listId }: { listId: number }) {
  const { data: list, isLoading } = useShoppingList(listId)
  const addItem = useAddShoppingItem(listId)
  const updateItem = useUpdateShoppingItem(listId)
  const deleteItem = useDeleteShoppingItem(listId)
  const walmartSearch = useWalmartSearch(listId, 0)
  const walmartSelect = useWalmartSelect(listId)
  const { toast } = useToast()
  const [newItem, setNewItem] = useState({ ingredient_name: '', quantity: '', category: 'produce' })
  const [searchDrawer, setSearchDrawer] = useState<{ item: ShoppingListItem } | null>(null)
  const [walmartResults, setWalmartResults] = useState<WalmartProduct[]>([])

  const handleAddItem = async () => {
    if (!newItem.ingredient_name.trim()) return
    await addItem.mutateAsync({ ingredient_name: newItem.ingredient_name, quantity: newItem.quantity, category: newItem.category })
    setNewItem({ ingredient_name: '', quantity: '', category: 'produce' })
  }

  const handleWalmartSearch = async (item: ShoppingListItem) => {
    setSearchDrawer({ item })
    setWalmartResults([])
    try {
      const search = useWalmartSearch(listId, item.id)
      const results = await walmartSearch.mutateAsync()
      setWalmartResults(results)
    } catch {
      toast('Walmart search unavailable. Check API credentials.', 'error')
    }
  }

  const handleWalmartSelect = async (item: ShoppingListItem, product: WalmartProduct) => {
    await walmartSelect.mutateAsync({
      itemId: item.id,
      data: {
        walmart_product_id: product.item_id,
        walmart_price_cents: Math.round((product.sale_price ?? 0) * 100),
        walmart_product_url: product.product_url ?? '',
      },
    })
    toast('Product linked!', 'success')
    setSearchDrawer(null)
  }

  if (isLoading) return <div className="flex justify-center h-32"><Spinner /></div>
  if (!list) return null

  const groups = groupByCategory(list.items)
  const checkedCount = list.items.filter((i) => i.is_checked).length
  const totalCents = list.items.reduce((sum, i) => sum + (i.walmart_price_cents ?? 0), 0)

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-slate-100">{list.name}</h2>
          <p className="text-xs text-slate-400">{checkedCount}/{list.items.length} checked{totalCents > 0 ? ` · Est. $${(totalCents / 100).toFixed(2)}` : ''}</p>
        </div>
      </div>

      {/* Add item row */}
      <div className="flex gap-2 mb-6">
        <input
          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Add item..."
          value={newItem.ingredient_name}
          onChange={(e) => setNewItem({ ...newItem, ingredient_name: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
        />
        <input
          className="w-24 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Qty"
          value={newItem.quantity}
          onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
        />
        <select
          className="bg-slate-700 border border-slate-600 rounded-lg px-2 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={newItem.category}
          onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Button onClick={handleAddItem} loading={addItem.isPending} size="sm"><Plus size={14} /></Button>
      </div>

      {list.items.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">No items yet. Add some above!</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([cat, items]) => (
            <div key={cat}>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 capitalize">{cat}</h4>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className={`flex items-center gap-3 p-2 rounded-lg transition-all ${item.is_checked ? 'opacity-50' : ''}`}>
                    <button onClick={() => updateItem.mutateAsync({ itemId: item.id, data: { is_checked: !item.is_checked } })}>
                      {item.is_checked ? <CheckSquare size={18} className="text-indigo-400" /> : <Square size={18} className="text-slate-400" />}
                    </button>
                    <span className={`flex-1 text-sm ${item.is_checked ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {item.ingredient_name}
                      {item.quantity && <span className="text-slate-400 ml-1">({item.quantity})</span>}
                    </span>
                    {item.walmart_price_cents && (
                      <span className="text-xs text-green-400 font-medium">${(item.walmart_price_cents / 100).toFixed(2)}</span>
                    )}
                    {item.walmart_product_url && (
                      <a href={item.walmart_product_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-yellow-400">
                        <ExternalLink size={14} />
                      </a>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleWalmartSearch(item)} className="text-xs text-slate-400 hover:text-yellow-400 px-2">
                      <Search size={13} /> Walmart
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteItem.mutateAsync(item.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1">
                      <Trash2 size={13} />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Walmart search drawer */}
      {searchDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSearchDrawer(null)} />
          <div className="relative w-full max-w-md bg-slate-800 border-l border-slate-700 h-full overflow-y-auto p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-100">
                Walmart: {searchDrawer.item.ingredient_name}
              </h3>
              <button onClick={() => setSearchDrawer(null)} className="text-slate-400 hover:text-slate-100"><X size={20} /></button>
            </div>
            {walmartSearch.isPending ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : walmartResults.length > 0 ? (
              <div className="space-y-3">
                {walmartResults.map((p) => (
                  <div key={p.item_id} className="bg-slate-700 rounded-xl p-3 flex gap-3">
                    {p.thumbnail_image && (
                      <img src={p.thumbnail_image} alt={p.name} className="w-16 h-16 object-contain rounded-lg bg-white" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 line-clamp-2">{p.name}</p>
                      {p.sale_price && <p className="text-green-400 font-semibold mt-1">${p.sale_price.toFixed(2)}</p>}
                      {p.customer_rating && <p className="text-xs text-slate-400">★ {p.customer_rating}</p>}
                    </div>
                    <Button size="sm" onClick={() => handleWalmartSelect(searchDrawer.item, p)}>Select</Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 text-sm text-center py-10">
                {walmartSearch.isError ? 'Walmart API unavailable. Add credentials in .env.' : 'Search results will appear here.'}
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  )
}
