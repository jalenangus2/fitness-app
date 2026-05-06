import client from './client'
import type { Bill, PaycheckConfig } from '../types'

export const getBills = () =>
  client.get<Bill[]>('/bills').then(r => r.data)

export const createBill = (data: { name: string; amount_cents: number; due_day: number }) =>
  client.post<Bill>('/bills', data).then(r => r.data)

export const deleteBill = (id: number) =>
  client.delete(`/bills/${id}`)

export const getPaycheckConfig = () =>
  client.get<PaycheckConfig | null>('/bills/paycheck').then(r => r.data)

export const savePaycheckConfig = (data: { reference_date: string; frequency_days: number; amount_cents: number }) =>
  client.post<PaycheckConfig>('/bills/paycheck', data).then(r => r.data)
