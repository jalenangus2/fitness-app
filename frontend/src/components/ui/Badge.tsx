import { cn } from '../../utils/cn'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'indigo' | 'green' | 'yellow' | 'red' | 'slate' | 'blue'
  className?: string
}

export default function Badge({ children, variant = 'slate', className }: BadgeProps) {
  const variants = {
    indigo: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    green: 'bg-green-500/20 text-green-300 border-green-500/30',
    yellow: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    red: 'bg-red-500/20 text-red-300 border-red-500/30',
    slate: 'bg-slate-600/50 text-slate-300 border-slate-600',
    blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
