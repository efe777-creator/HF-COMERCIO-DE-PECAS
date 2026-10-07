import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import {
  adminListCustomerGroups,
  adminUpsertCustomerGroup,
  type AdminCustomerGroup,
} from '@/services/admin/adminB2bCustomerService'
import {
  adminAssignCatalogToGroup,
  adminListCatalogs,
  adminListGroupCatalogIds,
  type AdminCatalogList,
} from '@/services/admin/adminCatalogListService'
import { useEffect, useState, type FormEvent } from 'react'

export function AdminCustomerGroupsPage() {
  const [items, setItems] = useState<AdminCustomerGroup[]>([])
  const [catalogs, setCatalogs] = useState<AdminCatalogList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<AdminCustomerGroup | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [catalogId, setCatalogId] = useState('')
  const [assigned, setAssigned] = useState<string[]>([])

  async function reload() {
    setLoading(true)
    try {
      setItems(await adminListCustomerGroups())
      setCatalogs(await adminListCatalogs())
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

  async function startEdit(g: AdminCustomerGroup) {
    setEditing(g)
    setName(g.name)
    setCode(g.code)
    setDescription(g.description ?? '')
    setAssigned(await adminListGroupCatalogIds(g.id))
  }

  function reset() {
    setEditing(null)
    setName('')
    setCode('')
    setDescription('')
    setCatalogId('')
    setAssigned([])
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await adminUpsertCustomerGroup({
        id: editing?.id,
        name,
        code,
        description,
        status: editing?.status ?? 'active',
      })
      reset()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-fal-navy">Grupos de clientes</h1>
      <p className="text-sm text-fal-muted">
        Herança comercial: grupo → catálogo. Clientes do grupo herdam a lista.
      </p>

      <form onSubmit={onSubmit} className="grid gap-3 rounded-[14px] border border-fal-line bg-white p-4 md:grid-cols-2">
        <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Código" value={code} onChange={(e) => setCode(e.target.value)} required />
        <div className="md:col-span-2">
          <Input label="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit">{editing ? 'Salvar' : 'Criar grupo'}</Button>
          {editing ? (
            <Button type="button" variant="light" onClick={reset}>
              Cancelar
            </Button>
          ) : null}
        </div>
        {editing ? (
          <div className="md:col-span-2 rounded-[10px] border border-fal-line bg-fal-bg p-3">
            <p className="m-0 text-sm font-semibold">Catálogos do grupo ({assigned.length})</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <select
                className="rounded-[10px] border border-fal-line px-3 py-2 text-sm"
                value={catalogId}
                onChange={(e) => setCatalogId(e.target.value)}
              >
                <option value="">Selecionar…</option>
                {catalogs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="light"
                disabled={!catalogId}
                onClick={() => {
                  void (async () => {
                    if (!editing || !catalogId) return
                    await adminAssignCatalogToGroup(editing.id, catalogId)
                    setAssigned(await adminListGroupCatalogIds(editing.id))
                    setCatalogId('')
                  })()
                }}
              >
                Associar
              </Button>
            </div>
          </div>
        ) : null}
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
            {items.map((g) => (
              <tr key={g.id} className="border-t border-fal-line">
                <td className="px-3 py-2 font-semibold">{g.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{g.code}</td>
                <td className="px-3 py-2">{g.status}</td>
                <td className="px-3 py-2">
                  <Button type="button" variant="light" size="sm" onClick={() => void startEdit(g)}>
                    Editar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
