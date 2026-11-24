import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { productStatusLabel } from '@/lib/adminLabels'
import {
  adminListKitComponents,
  adminListProducts,
  adminReleaseProductToStore,
} from '@/services/admin/adminProductService'
import type { Product } from '@/types'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export function AdminKitsPage() {
  const [q, setQ] = useState('')
  const [items, setItems] = useState<Product[]>([])
  const [bomCount, setBomCount] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [releasingId, setReleasingId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await adminListProducts({
        productKind: 'kit',
        q: q.trim() || undefined,
      })
      setItems(rows)
      const counts: Record<string, number> = {}
      await Promise.all(
        rows.map(async (k) => {
          try {
            const bom = await adminListKitComponents(k.id)
            counts[k.id] = bom.length
          } catch {
            counts[k.id] = 0
          }
        }),
      )
      setBomCount(counts)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao listar kits')
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    void reload()
  }, [reload])

  async function liberar(id: string) {
    if (
      !window.confirm(
        'Liberar kit na loja?\n\n• Publicar (status → published)\n• Marcar disponível\n\nConfirmar?',
      )
    ) {
      return
    }
    setReleasingId(id)
    setError(null)
    try {
      const bom = await adminListKitComponents(id)
      if (bom.length < 1) throw new Error('Kit sem composição — adicione itens antes de liberar.')
      await adminReleaseProductToStore({ productId: id, publishIfNeeded: true })
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao liberar')
    } finally {
      setReleasingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-extrabold text-hf-ink">Kits</h1>
          <p className="mt-1 max-w-2xl text-sm text-hf-muted">
            SKU de venda composto por itens. Cadastre a composição aqui (não na lista de Produtos).
            Fotos podem ser puxadas dos itens do BOM.
          </p>
        </div>
        <Link to="/admin/kits/novo">
          <Button type="button">Novo kit</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          label="Buscar"
          placeholder="Nome ou SKU"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="button" variant="light" onClick={() => void reload()}>
          Atualizar
        </Button>
      </div>

      {error ? <p className="text-sm text-hf-danger">{error}</p> : null}
      {loading ? <Loading label="Carregando kits…" /> : null}

      {!loading ? (
        <div className="overflow-x-auto rounded-[14px] border border-hf-line bg-hf-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-hf-bg text-hf-muted">
              <tr>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Itens BOM</th>
                <th className="px-3 py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-hf-muted">
                    Nenhum kit. Crie o primeiro ou converta itens em composição.
                  </td>
                </tr>
              ) : (
                items.map((k) => (
                  <tr key={k.id} className="border-t border-hf-line">
                    <td className="px-3 py-2 font-mono text-xs">{k.sku}</td>
                    <td className="px-3 py-2 font-semibold text-hf-ink">{k.name}</td>
                    <td className="px-3 py-2">{productStatusLabel(k.status)}</td>
                    <td className="px-3 py-2">{bomCount[k.id] ?? '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          className="font-semibold text-hf-auth-link"
                          to={`/admin/kits/${k.id}`}
                        >
                          Editar
                        </Link>
                        <button
                          type="button"
                          className="font-semibold text-hf-ink disabled:opacity-50"
                          disabled={releasingId === k.id}
                          onClick={() => void liberar(k.id)}
                        >
                          Liberar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
