import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { entityStatusLabel } from '@/lib/adminLabels'
import {
  adminListSuppliers,
  adminSetSupplierStatus,
  adminUpsertSupplier,
} from '@/services/admin/adminSupplierService'
import type { Supplier } from '@/types'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

export function AdminSuppliersPage() {
  const [items, setItems] = useState<Supplier[]>([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    try {
      setItems(await adminListSuppliers())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await adminUpsertSupplier({
        id: editing?.id,
        name,
        code: code || null,
        status: editing?.status ?? 'active',
      })
      setName('')
      setCode('')
      setEditing(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-fal-navy">Fornecedores</h1>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/fornecedores/importar-conversoes">
            <Button variant="light">Importar conversões</Button>
          </Link>
          <Link to="/admin/fornecedores/importar-custos">
            <Button variant="light">Importar custos</Button>
          </Link>
        </div>
      </div>
      <form onSubmit={onSubmit} className="grid gap-3 rounded-[14px] border border-fal-line bg-white p-4 md:grid-cols-3">
        <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Código" value={code} onChange={(e) => setCode(e.target.value)} />
        <div className="flex items-end">
          <Button type="submit">{editing ? 'Salvar' : 'Criar'}</Button>
        </div>
      </form>
      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
      {loading ? <Loading /> : null}
      <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-fal-bg text-fal-muted">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-t border-fal-line">
                <td className="px-3 py-2 font-semibold">{s.name}</td>
                <td className="px-3 py-2 text-fal-muted">{s.code ?? '—'}</td>
                <td className="px-3 py-2">{entityStatusLabel(s.status)}</td>
                <td className="px-3 py-2 space-x-2">
                  <button type="button" className="font-semibold text-fal-auth-link" onClick={() => { setEditing(s); setName(s.name); setCode(s.code ?? '') }}>Editar</button>
                  <button type="button" className="font-semibold text-fal-muted" onClick={() => void adminSetSupplierStatus(s.id, s.status === 'active' ? 'inactive' : 'active').then(reload)}>
                    {s.status === 'active' ? 'Inativar' : 'Ativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
