import { getSupabase } from '@/lib/supabase'
import type { Supplier } from '@/types'

type Row = { id: string; name: string; code: string | null; status: string }

function map(row: Row): Supplier {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    status: row.status as Supplier['status'],
  }
}

export async function adminListSuppliers(): Promise<Supplier[]> {
  const { data, error } = await getSupabase()
    .from('suppliers')
    .select('id, name, code, status')
    .order('name')
  if (error) throw error
  return (data as Row[]).map(map)
}

export async function adminUpsertSupplier(input: {
  id?: string
  name: string
  code?: string | null
  status?: Supplier['status']
}): Promise<Supplier> {
  const payload = {
    name: input.name.trim(),
    code: input.code?.trim() || null,
    status: input.status ?? 'active',
  }
  const q = getSupabase().from('suppliers')
  const { data, error } = input.id
    ? await q.update(payload).eq('id', input.id).select().single()
    : await q.insert(payload).select().single()
  if (error) throw error
  return map(data as Row)
}

export async function adminSetSupplierStatus(id: string, status: Supplier['status']) {
  const { error } = await getSupabase().from('suppliers').update({ status }).eq('id', id)
  if (error) throw error
}
