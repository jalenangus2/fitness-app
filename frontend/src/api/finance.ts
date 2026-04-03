import client from './client'
import type { PlaidAccount, Transaction, Budget, BudgetWithSpend, FinanceSummary } from '../types'

export const getLinkToken = async (): Promise<{ link_token: string }> => {
  const res = await client.post('/finance/link/token')
  return res.data
}

export const exchangeToken = async (data: {
  public_token: string
  institution_name: string
  institution_id: string
}) => {
  const res = await client.post('/finance/link/exchange', data)
  return res.data
}

export const getAccounts = async (): Promise<PlaidAccount[]> => {
  const res = await client.get('/finance/accounts')
  return res.data
}

export const deleteAccount = async (id: number): Promise<void> => {
  await client.delete(`/finance/accounts/${id}`)
}

export const syncTransactions = async (): Promise<{ added: number; modified: number; removed: number }> => {
  const res = await client.post('/finance/sync')
  return res.data
}

export const getTransactions = async (params?: {
  month?: string
  category?: string
  account_id?: number
  search?: string
  limit?: number
  offset?: number
}): Promise<Transaction[]> => {
  const res = await client.get('/finance/transactions', { params })
  return res.data
}

export const updateTransactionCategory = async (id: number, custom_category: string): Promise<Transaction> => {
  const res = await client.patch(`/finance/transactions/${id}/category`, { custom_category })
  return res.data
}

export const getBudgets = async (): Promise<BudgetWithSpend[]> => {
  const res = await client.get('/finance/budgets')
  return res.data
}

export const createBudget = async (data: Partial<Budget>): Promise<BudgetWithSpend> => {
  const res = await client.post('/finance/budgets', data)
  return res.data
}

export const updateBudget = async (id: number, data: Partial<Budget>): Promise<BudgetWithSpend> => {
  const res = await client.put(`/finance/budgets/${id}`, data)
  return res.data
}

export const deleteBudget = async (id: number): Promise<void> => {
  await client.delete(`/finance/budgets/${id}`)
}

export const getFinanceSummary = async (): Promise<FinanceSummary> => {
  const res = await client.get('/finance/summary')
  return res.data
}
