import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import {
  adminAddProductToCatalog,
  adminListCatalogProductIds,
  adminListCatalogs,
  adminRemoveProductFromCatalog,
  adminUpsertCatalog,
  type AdminCatalogList,
} from '@/services/admin/adminCatalogListService'
import { adminListProducts } from '@/services/admin/adminProductService'
import type { Product } from '@/types'
import { useEffect, useState, type FormEvent } from 'react'

export function AdminCatalogsPage() {
  const [items, setItems] = useState<AdminCatalogList[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<AdminCatalogList | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [productId, setProductId] = useState('')
  const [memberIds, setMemberIds] = useState<string[]>([])

  async function reload() {
    setLoading(true)
    try {
      setItems(await adminListCatalogs())
      setProducts(await adminListProducts())
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

  async function startEdit(c: AdminCatalogList) {
    setEditing(c)
    setName(c.name)
    setCode(c.code)
    setDescription(c.description ?? '')
    setMemberIds(await adminListCatalogProductIds(c.id))
  }

  function reset() {
    setEditing(null)
    setName('')
    setCode('')
    setDescription('')
    setProductId('')
    setMemberIds([])
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await adminUpsertCatalog({
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

  const members = products.filter((p) => memberIds.includes(p.id))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-fal-navy">Listas de catálogo</h1>
      <p className="text-sm text-fal-muted">
        Um produto único pode pertencer a várias listas. Clientes/grupos enxergam só o que for
        associado.
      </p>

      <form onSubmit={onSubmit} className="grid gap-3 rounded-[14px] border border-fal-line bg-white p-4 md:grid-cols-2">
        <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Código" value={code} onChange={(e) => setCode(e.target.value)} required />
        <div className="md:col-span-2">
          <Input label="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex gap-2 md:col-span-2">
          <Button type="submit">{editing ? 'Salvar lista' : 'Criar lista'}</Button>
          {editing ? (
            <Button type="button" variant="light" onClick={reset}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>

      {editing ? (
        <div className="rounded-[14px] border border-fal-line bg-white p-4">
          <h2 className="m-0 text-lg font-extrabold text-fal-navy">
            Produtos em {editing.name} ({memberIds.length})
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              className="min-w-[240px] flex-1 rounded-[10px] border border-fal-line px-3 py-2 text-sm"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">Produto publicado…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} — {p.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              disabled={!productId}
              onClick={() => {
                void (async () => {
                  if (!editing || !productId) return
                  await adminAddProductToCatalog(editing.id, productId)
                  setMemberIds(await adminListCatalogProductIds(editing.id))
                  setProductId('')
                  await reload()
                })()
              }}
            >
              Incluir produto
            </Button>
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {members.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-[10px] border border-fal-line px-3 py-2"
              >
                <span>
                  <span className="font-mono text-xs">{p.sku}</span> — {p.name}
                </span>
                <Button
                  type="button"
                  variant="light"
                  size="sm"
                  onClick={() => {
                    void (async () => {
                      await adminRemoveProductFromCatalog(editing.id, p.id)
                      setMemberIds(await adminListCatalogProductIds(editing.id))
                      await reload()
                    })()
                  }}
                >
                  Remover
                </Button>
              </li>
            ))}
            {members.length === 0 ? (
              <li className="text-fal-muted">Nenhum produto nesta lista ainda.</li>
            ) : null}
          </ul>
        </div>
      ) : null}

      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
      {loading ? <Loading /> : null}

      <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-fal-bg text-fal-muted">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2">Produtos</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t border-fal-line">
                <td className="px-3 py-2 font-semibold">{c.name}</td>
                <td className="px-3 py-2 font-mono text-xs">{c.code}</td>
                <td className="px-3 py-2">{c.productCount}</td>
                <td className="px-3 py-2">{c.status}</td>
                <td className="px-3 py-2">
                  <Button type="button" variant="light" size="sm" onClick={() => void startEdit(c)}>
                    Gerenciar
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
