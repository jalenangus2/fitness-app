import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { ToastProvider } from './components/ui/Toast'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import WorkoutPage from './pages/WorkoutPage'
import MealPage from './pages/MealPage'
import ShoppingPage from './pages/ShoppingPage'
import SchedulePage from './pages/SchedulePage'
import FashionPage from './pages/FashionPage'
import FinancePage from './pages/FinancePage'
import SharedMealPlanPage from './pages/SharedMealPlanPage'
import SharedWorkoutPlanPage from './pages/SharedWorkoutPlanPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 * 5 },
  },
})

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/shared/meal/:token', element: <SharedMealPlanPage /> },
  { path: '/shared/workout/:token', element: <SharedWorkoutPlanPage /> },
  {
    element: <AppShell />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/workout', element: <WorkoutPage /> },
      { path: '/meal', element: <MealPage /> },
      { path: '/shopping', element: <ShoppingPage /> },
      { path: '/schedule', element: <SchedulePage /> },
      { path: '/fashion', element: <FashionPage /> },
      { path: '/finance', element: <FinancePage /> },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  )
}
