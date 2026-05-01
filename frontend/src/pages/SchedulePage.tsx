import { useState } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus, Trash2, CheckSquare, Square, Calendar, Repeat, RefreshCw } from 'lucide-react'
import { useEvents, useCreateEvent, useDeleteEvent, useTasks, useCreateTask, useCompleteTask, useDeleteTask, useFashionSync } from '../hooks/useSchedule'
import { useToast } from '../components/ui/Toast'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import type { CalendarEvent } from '../types'

const EVENT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6']
const PRIORITY_OPTIONS = [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]
const TASK_CATEGORIES = [
  { value: 'workout', label: 'Workout' },
  { value: 'meal', label: 'Meal' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
]
const RECURRENCE_OPTIONS = [
  { value: '', label: 'Does not repeat' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
]

export default function SchedulePage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showEventModal, setShowEventModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const { toast } = useToast()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)

  const { data: events = [] } = useEvents(monthStart.toISOString(), monthEnd.toISOString())
  const { data: tasks = [] } = useTasks()
  const createEvent = useCreateEvent()
  const deleteEvent = useDeleteEvent()
  const createTask = useCreateTask()
  const completeTask = useCompleteTask()
  const deleteTask = useDeleteTask()
  const fashionSync = useFashionSync()

  const [eventForm, setEventForm] = useState({
    title: '', description: '', start_datetime: '', end_datetime: '',
    all_day: false, color: '#6366f1', recurrence_rule: '',
  })
  const [taskForm, setTaskForm] = useState<{
    title: string; due_date: string; priority: 'low' | 'medium' | 'high'; category: string; recurrence_rule: string
  }>({ title: '', due_date: '', priority: 'medium', category: 'personal', recurrence_rule: '' })

  const handleCreateEvent = async () => {
    if (!eventForm.title || !eventForm.start_datetime) { toast('Title and start time required.', 'error'); return }
    try {
      await createEvent.mutateAsync({
        ...eventForm,
        recurrence_rule: eventForm.recurrence_rule || null,
      } as Partial<CalendarEvent>)
      toast('Event created!', 'success')
      setShowEventModal(false)
      setEventForm({ title: '', description: '', start_datetime: '', end_datetime: '', all_day: false, color: '#6366f1', recurrence_rule: '' })
    } catch {
      toast('Failed to create event. Please try again.', 'error')
    }
  }

  const handleCreateTask = async () => {
    if (!taskForm.title) { toast('Task title required.', 'error'); return }
    try {
      await createTask.mutateAsync({
        ...taskForm,
        recurrence_rule: taskForm.recurrence_rule || null,
      } as any)
      toast('Task added!', 'success')
      setShowTaskModal(false)
      setTaskForm({ title: '', due_date: '', priority: 'medium', category: 'personal', recurrence_rule: '' })
    } catch {
      toast('Failed to create task. Please try again.', 'error')
    }
  }

  const handleFashionSync = async () => {
    try {
      const result = await fashionSync.mutateAsync()
      toast(result.synced > 0 ? `Synced ${result.synced} fashion drop${result.synced !== 1 ? 's' : ''} to calendar!` : 'All fashion drops already synced.', 'success')
    } catch {
      toast('Fashion sync failed. Please try again.', 'error')
    }
  }

  // Build calendar grid
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)
  const weeks: Date[][] = []
  let day = calStart
  while (day <= calEnd) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) { week.push(day); day = addDays(day, 1) }
    weeks.push(week)
  }

  const eventsOnDay = (d: Date) =>
    events.filter((e) => isSameDay(parseISO(e.start_datetime), d))

  const selectedEvents = eventsOnDay(selectedDate)
  const selectedTasks = tasks.filter((t) => t.due_date && isSameDay(parseISO(t.due_date), selectedDate))
  const incompleteTasks = tasks.filter((t) => !t.is_completed)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Schedule</h1>
          <p className="text-slate-400 mt-1">Your calendar and task manager.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleFashionSync} loading={fashionSync.isPending} title="Sync upcoming fashion drops to calendar">
            <RefreshCw size={13} /> Fashion Drops
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowTaskModal(true)}><Plus size={15} /> Task</Button>
          <Button size="sm" onClick={() => setShowEventModal(true)}><Plus size={15} /> Event</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-100">{format(currentMonth, 'MMMM yyyy')}</h2>
              <div className="flex gap-1">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-lg transition-all">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-lg transition-all">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="text-center text-xs text-slate-500 py-1 font-medium">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-700">
              {weeks.flat().map((d, i) => {
                const dayEvents = eventsOnDay(d)
                const isSelected = isSameDay(d, selectedDate)
                const isCurrentMonth = isSameMonth(d, currentMonth)
                const isToday = isSameDay(d, new Date())
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDate(d)}
                    className={`bg-slate-800 min-h-[72px] p-1.5 cursor-pointer hover:bg-slate-700/60 transition-all ${!isCurrentMonth ? 'opacity-30' : ''}`}
                  >
                    <span className={`text-xs inline-flex items-center justify-center w-6 h-6 rounded-full font-medium ${isSelected ? 'bg-indigo-600 text-white' : isToday ? 'bg-slate-600 text-slate-100' : 'text-slate-300'}`}>
                      {format(d, 'd')}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map((ev, idx) => (
                        <div key={`${ev.id}-${idx}`} className="text-xs truncate rounded px-1 py-0.5 flex items-center gap-0.5" style={{ backgroundColor: ev.color + '33', color: ev.color }}>
                          {ev.recurrence_rule && <Repeat size={8} className="flex-shrink-0" />}
                          <span className="truncate">{ev.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 2 && <p className="text-xs text-slate-500">+{dayEvents.length - 2}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Sidebar: selected day + tasks */}
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-slate-100 mb-3">{format(selectedDate, 'EEEE, MMM d')}</h3>
            {selectedEvents.length > 0 ? (
              <div className="space-y-2">
                {selectedEvents.map((ev, idx) => (
                  <div key={`${ev.id}-${idx}`} className="flex items-start gap-2 p-2 rounded-lg" style={{ backgroundColor: ev.color + '22' }}>
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: ev.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium text-slate-200">{ev.title}</p>
                        {ev.recurrence_rule && <Repeat size={11} className="text-slate-400 flex-shrink-0" />}
                      </div>
                      {!ev.all_day && <p className="text-xs text-slate-400">{format(parseISO(ev.start_datetime), 'h:mm a')}</p>}
                      {ev.recurrence_rule && <p className="text-xs text-slate-500 capitalize">{ev.recurrence_rule.toLowerCase()}</p>}
                    </div>
                    <button
                      onClick={() => deleteEvent.mutateAsync(ev.id)}
                      title={ev.recurrence_rule ? 'Delete entire series' : 'Delete event'}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No events on this day.</p>
            )}
            {selectedTasks.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Tasks</p>
                {selectedTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm py-1">
                    <button onClick={() => completeTask.mutateAsync(t.id)}>
                      {t.is_completed ? <CheckSquare size={15} className="text-indigo-400" /> : <Square size={15} className="text-slate-400" />}
                    </button>
                    <span className={t.is_completed ? 'line-through text-slate-500' : 'text-slate-300'}>{t.title}</span>
                    {t.recurrence_rule && <Repeat size={11} className="text-slate-500" />}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="font-semibold text-slate-100 mb-3 flex items-center gap-2">
              <Calendar size={15} className="text-yellow-400" />
              Open Tasks ({incompleteTasks.length})
            </h3>
            {incompleteTasks.length === 0 ? (
              <p className="text-slate-500 text-sm">All done!</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {incompleteTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <button onClick={() => completeTask.mutateAsync(t.id)} className="flex-shrink-0">
                      <Square size={15} className="text-slate-400" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-slate-300 truncate">{t.title}</p>
                        {t.recurrence_rule && <Repeat size={10} className="text-slate-500 flex-shrink-0" />}
                      </div>
                      {t.due_date && <p className="text-xs text-slate-500">{format(parseISO(t.due_date), 'MMM d')}</p>}
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.priority === 'high' ? 'bg-red-400' : t.priority === 'medium' ? 'bg-yellow-400' : 'bg-slate-500'}`} />
                    <button onClick={() => deleteTask.mutateAsync(t.id)} className="text-slate-500 hover:text-red-400">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Event modal */}
      <Modal isOpen={showEventModal} onClose={() => setShowEventModal(false)} title="Add Event" size="md">
        <div className="space-y-4">
          <Input label="Title" value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Team meeting" autoFocus />
          <Input label="Description" value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Optional" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Start" type="datetime-local" value={eventForm.start_datetime} onChange={(e) => setEventForm({ ...eventForm, start_datetime: e.target.value })} />
            <Input label="End" type="datetime-local" value={eventForm.end_datetime} onChange={(e) => setEventForm({ ...eventForm, end_datetime: e.target.value })} />
          </div>
          <Select
            label="Repeat"
            options={RECURRENCE_OPTIONS}
            value={eventForm.recurrence_rule}
            onChange={(e) => setEventForm({ ...eventForm, recurrence_rule: e.target.value })}
          />
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">Color</p>
            <div className="flex gap-2">
              {EVENT_COLORS.map((c) => (
                <button key={c} onClick={() => setEventForm({ ...eventForm, color: c })} className={`w-7 h-7 rounded-full border-2 transition-all ${eventForm.color === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowEventModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleCreateEvent} loading={createEvent.isPending} className="flex-1">Add Event</Button>
          </div>
        </div>
      </Modal>

      {/* Task modal */}
      <Modal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} title="Add Task" size="sm">
        <div className="space-y-4">
          <Input label="Task" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="Buy groceries" autoFocus />
          <Input label="Due Date" type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Priority" options={PRIORITY_OPTIONS} value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as 'low' | 'medium' | 'high' })} />
            <Select label="Category" options={TASK_CATEGORIES} value={taskForm.category} onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })} />
          </div>
          <Select
            label="Repeat"
            options={RECURRENCE_OPTIONS}
            value={taskForm.recurrence_rule}
            onChange={(e) => setTaskForm({ ...taskForm, recurrence_rule: e.target.value })}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowTaskModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleCreateTask} loading={createTask.isPending} className="flex-1">Add Task</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
