import { cn } from '../../utils/cn'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export default function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={cn(
        'bg-slate-800 rounded-xl border border-slate-700 p-5',
        onClick && 'cursor-pointer hover:border-slate-500 transition-colors',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
