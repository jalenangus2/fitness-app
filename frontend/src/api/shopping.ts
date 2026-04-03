import client from './client'
import type { ShoppingList, ShoppingListItem, WalmartProduct } from '../types'

export const getShoppingLists = async (): Promise<ShoppingList[]> => {
  const res = await client.get('/shopping')
  return res.data
}

export const getShoppingList = async (id: number): Promise<ShoppingList> => {
  const res = await client.get(`/shopping/${id}`)
  return res.data
}

export const createShoppingList = async (data: { name: string; meal_plan_id?: number }): Promise<ShoppingList> => {
  const res = await client.post('/shopping', data)
  return res.data
}

export const deleteShoppingList = async (id: number): Promise<void> => {
  await client.delete(`/shopping/${id}`)
}

export const addShoppingItem = async (
  listId: number,
  data: { ingredient_name: string; quantity?: string; category?: string }
): Promise<ShoppingListItem> => {
  const res = await client.post(`/shopping/${listId}/items`, data)
  return res.data
}

export const updateShoppingItem = async (
  listId: number,
  itemId: number,
  data: Partial<ShoppingListItem>
): Promise<ShoppingListItem> => {
  const res = await client.put(`/shopping/${listId}/items/${itemId}`, data)
  return res.data
}

export const deleteShoppingItem = async (listId: number, itemId: number): Promise<void> => {
  await client.delete(`/shopping/${listId}/items/${itemId}`)
}

export const walmartSearch = async (listId: number, itemId: number): Promise<WalmartProduct[]> => {
  const res = await client.post(`/shopping/${listId}/items/${itemId}/walmart-search`)
  return res.data
}

export const walmartSelect = async (
  listId: number,
  itemId: number,
  data: { walmart_product_id: string; walmart_price_cents: number; walmart_product_url: string }
): Promise<ShoppingListItem> => {
  const res = await client.patch(`/shopping/${listId}/items/${itemId}/walmart-select`, data)
  return res.data
}
