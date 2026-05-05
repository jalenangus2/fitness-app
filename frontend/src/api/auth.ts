import client from './client'

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
}

export const login = async (data: LoginRequest) => {
  const form = new URLSearchParams()
  form.append('username', data.username)
  form.append('password', data.password)
  const res = await client.post('/auth/token', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return res.data as { access_token: string; token_type: string; user: { id: number; email: string; username: string } }
}

export const register = async (data: RegisterRequest) => {
  const res = await client.post('/auth/register', data)
  return res.data
}

export const getMe = async () => {
  const res = await client.get('/auth/me')
  return res.data
}

export const updateMe = async (data: { display_name: string | null }) => {
  const res = await client.patch('/auth/me', data)
  return res.data
}

export interface NutritionGoals {
  nutrition_target_calories: number | null
  nutrition_target_protein_g: number | null
  nutrition_target_carbs_g: number | null
  nutrition_target_fat_g: number | null
}

export const updateNutritionGoals = async (data: Partial<NutritionGoals>) => {
  const res = await client.patch('/auth/me/goals', data)
  return res.data as NutritionGoals & { id: number; email: string; username: string }
}
