import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { entityStatusLabel } from '@/lib/adminLabels'
import { adminListBrands, adminSetBrandStatus, adminUpsertBrand } from '@/services/admin/adminBrandService'
import type { ProductBrand } from '@/types'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

export function AdminBrandsPage() {
  const [items, setItems] = useState<ProductBrand[]>([])
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<ProductBrand | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  async function reload() {
    setLoading(true)
    try {
      setItems(await adminListBrands())
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((b) => b.name.toLowerCase().includes(q) || b.slug.toLowerCase().includes(q))
  }, [items, search])

  function startEdit(b: ProductBrand) {
    setEditing(b)
    setName(b.name)
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })
  }

  function cancelEdit() {
    setEditing(null)
    setName('')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await adminUpsertBrand({ id: editing?.id, name, status: editing?.status ?? 'active' })
      setName('')
      setEditing(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-hf-ink">Fabricantes</h1>
      <p className="text-sm text-hf-muted">
        Fabricante de peça (ex.: Nakata). Diferente de montadora e fornecedor.
      </p>
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className={`flex flex-wrap items-end gap-3 rounded-[14px] border bg-hf-surface p-4 ${
          editing ? 'border-hf-red ring-2 ring-hf-red/40' : 'border-hf-line'
        }`}
      >
        <div className="min-w-[220px] flex-1">
          <Input
            ref={nameInputRef}
            label={editing ? 'Editar fabricante' : 'Novo fabricante'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <Button type="submit">{editing ? 'Salvar' : 'Criar'}</Button>
        {editing ? (
          <Button type="button" variant="light" onClick={cancelEdit}>
            Cancelar
          </Button>
        ) : null}
      </form>
      <Input
        label="Buscar fabricante"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Nome ou slug…"
      />
      {error ? <p className="text-sm text-hf-danger">{error}</p> : null}
      {loading ? <Loading /> : null}
      <div className="overflow-x-auto rounded-[14px] border border-hf-line bg-hf-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-hf-bg text-hf-muted">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-hf-muted">
                  Nenhum fabricante encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((b) => (
                <tr
                  key={b.id}
                  className={`border-t border-hf-line ${
                    editing?.id === b.id ? 'bg-hf-red/20' : ''
                  }`}
                >
                  <td className="px-3 py-2 font-semibold">{b.name}</td>
                  <td className="px-3 py-2 text-hf-muted">{b.slug}</td>
                  <td className="px-3 py-2">{entityStatusLabel(b.status)}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button
                      type="button"
                      className="font-semibold text-hf-auth-link"
                      onClick={() => startEdit(b)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="font-semibold text-hf-muted"
                      onClick={() =>
                        void adminSetBrandStatus(
                          b.id,
                          b.status === 'active' ? 'inactive' : 'active',
                        ).then(reload)
                      }
                    >
                      {b.status === 'active' ? 'Inativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
