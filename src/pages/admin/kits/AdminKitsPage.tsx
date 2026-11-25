import { KitWorkSurface } from '@/components/admin/kits/KitWorkSurface'
import { GuideStackPanels } from '@/components/admin/workspace/GuideStackPanels'
import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useIdSplitTabs } from '@/hooks/useIdSplitTabs'
import { productStatusLabel } from '@/lib/adminLabels'
import {
  adminListKitComponents,
  adminListProducts,
  adminReleaseProductToStore,
  isKitCompositionPublishable,
} from '@/services/admin/adminProductService'
import type { Product } from '@/types'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

export function AdminKitsPage() {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [items, setItems] = useState<Product[]>([])
  const [bomCount, setBomCount] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [releasingId, setReleasingId] = useState<string | null>(null)
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)
  const splitTabs = useIdSplitTabs()

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await adminListProducts({
        productKind: 'kit',
        q: q.trim() || undefined,
        status: status || undefined,
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
  }, [q, status])

  useEffect(() => {
    void reload()
  }, [reload])

  function patchKit(kit: Product) {
    setItems((prev) => {
      const i = prev.findIndex((p) => p.id === kit.id)
      if (i < 0) return [kit, ...prev]
      const next = prev.slice()
      next[i] = { ...next[i]!, ...kit }
      return next
    })
  }

  function openGuide(id: string) {
    setQuickCreateOpen(false)
    splitTabs.openTab(id)
  }

  function openQuickCreate() {
    splitTabs.closeAll()
    setQuickCreateOpen(true)
  }

  function closeContextual() {
    setQuickCreateOpen(false)
    splitTabs.closeAll()
  }

  function guideLabel(id: string) {
    if (splitTabs.openIds.includes(id)) {
      if (splitTabs.openIds.length > 1 && splitTabs.activeId !== id) return '+ Guia'
      return 'Na guia'
    }
    return 'Abrir guia'
  }

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
      if (!isKitCompositionPublishable(bom)) {
        throw new Error('Composição insuficiente: ≥2 itens ou 1 item com qty ≥ 2.')
      }
      await adminReleaseProductToStore({ productId: id, publishIfNeeded: true })
      await reload()
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : typeof e === 'object' && e && 'message' in e
            ? String((e as { message: unknown }).message)
            : 'Falha ao liberar'
      setError(msg || 'Falha ao liberar')
    } finally {
      setReleasingId(null)
    }
  }

  const contextualOpen = quickCreateOpen || splitTabs.hasOpen

  const contextualTitle = useMemo(() => {
    if (quickCreateOpen) return 'Novo kit'
    const id = splitTabs.activeId
    if (!id) return 'Kit'
    const k = items.find((x) => x.id === id)
    return k?.name ?? 'Kit'
  }, [items, splitTabs.activeId, quickCreateOpen])

  const primary = (
    <div className="space-y-3 sm:space-y-4" data-admin-kits-hub>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-xl font-extrabold text-hf-ink sm:text-2xl">Kits</h1>
          <p className="mt-1 mb-0 max-w-2xl text-xs text-hf-muted sm:text-sm">
            Lista + guia (duplo clique). Composição com itens do cadastro.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={openQuickCreate}>
            Novo na guia
          </Button>
          <Link to="/admin/kits/novo">
            <Button type="button" variant="light" size="sm">
              Ficha completa
            </Button>
          </Link>
        </div>
      </div>

      <form
        className="flex flex-col gap-2 rounded-[14px] border border-hf-line bg-hf-surface p-2.5 sm:flex-row sm:flex-wrap sm:items-end sm:p-3"
        onSubmit={(e) => {
          e.preventDefault()
          void reload()
        }}
      >
        <div className="min-w-0 flex-1 sm:min-w-[180px]">
          <Input
            label="Buscar"
            placeholder="Nome ou SKU"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <label className="block min-w-0 text-sm sm:min-w-[140px]">
          <span className="mb-1 block text-xs font-extrabold text-hf-muted">Status</span>
          <select
            className="w-full rounded-[9px] border border-hf-line bg-hf-surface px-3 py-3 text-hf-ink"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
            <option value="archived">Arquivado</option>
          </select>
        </label>
        <Button type="submit" variant="light" size="sm">
          Filtrar
        </Button>
      </form>

      {error ? <p className="text-sm text-hf-danger">{error}</p> : null}
      {loading ? <Loading label="Carregando kits…" /> : null}

      {!loading ? (
        <div className="overflow-x-auto rounded-[14px] border border-hf-line bg-hf-surface">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-hf-bg text-hf-muted">
              <tr>
                <th className="px-2 py-2 sm:px-3">SKU</th>
                <th className="px-2 py-2 sm:px-3">Nome</th>
                <th className="hidden px-3 py-2 md:table-cell">Status</th>
                <th className="px-2 py-2 text-center sm:px-3">BOM</th>
                <th className="px-2 py-2 sm:px-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-hf-muted">
                    Nenhum kit.{' '}
                    <button
                      type="button"
                      className="font-semibold text-hf-auth-link underline"
                      onClick={openQuickCreate}
                    >
                      Novo na guia
                    </button>
                  </td>
                </tr>
              ) : (
                items.map((k) => (
                  <tr
                    key={k.id}
                    className={`border-t border-hf-line ${
                      splitTabs.openIds.includes(k.id)
                        ? 'border-l-4 border-l-hf-red bg-hf-surface-2'
                        : ''
                    }`}
                    onDoubleClick={() => openGuide(k.id)}
                  >
                    <td className="px-2 py-2 font-mono text-[11px] sm:px-3 sm:text-xs">{k.sku}</td>
                    <td className="max-w-[9rem] truncate px-2 py-2 text-xs font-semibold text-hf-ink sm:max-w-none sm:px-3 sm:text-sm">
                      {k.name}
                      <span className="mt-0.5 block text-[10px] font-normal text-hf-muted md:hidden">
                        {productStatusLabel(k.status)}
                      </span>
                    </td>
                    <td className="hidden px-3 py-2 md:table-cell">
                      {productStatusLabel(k.status)}
                    </td>
                    <td className="px-2 py-2 text-center tabular-nums sm:px-3">
                      {bomCount[k.id] ?? '—'}
                    </td>
                    <td className="px-2 py-2 sm:px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-1 text-xs sm:flex-row sm:flex-wrap sm:gap-2 sm:text-sm">
                        <button
                          type="button"
                          className="text-left font-semibold text-hf-auth-link"
                          onClick={() => openGuide(k.id)}
                        >
                          {guideLabel(k.id)}
                        </button>
                        <Link
                          className="font-semibold text-hf-ink underline"
                          to={`/admin/kits/${k.id}`}
                        >
                          Cadastro
                        </Link>
                        <button
                          type="button"
                          className="text-left font-semibold text-hf-ink disabled:opacity-50"
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

  const contextual = contextualOpen ? (
    quickCreateOpen ? (
      <KitWorkSurface
        quickCreate
        onClose={() => setQuickCreateOpen(false)}
        onKitCreated={(kit) => {
          patchKit(kit)
          setQuickCreateOpen(false)
          splitTabs.openTab(kit.id)
          void reload()
        }}
      />
    ) : (
      <GuideStackPanels
        ids={splitTabs.openIds}
        meta={splitTabs.openIds.map((id) => {
          const k = items.find((x) => x.id === id)
          return {
            id,
            label: k?.name ?? id.slice(0, 8),
            statusLabel: k ? productStatusLabel(k.status) : undefined,
          }
        })}
        onCloseTab={splitTabs.closeTab}
        render={(id) => {
          const fromList = items.find((p) => p.id === id)
          const focused = fromList ?? ({ id, productKind: 'kit' } as Product)
          return (
            <KitWorkSurface
              focused={focused}
              busy={releasingId === id}
              onClose={() => splitTabs.closeTab(id)}
              onKitUpdated={patchKit}
              onLiberar={(kit) => void liberar(kit.id)}
              onBomChanged={() => void reload()}
            />
          )
        }}
      />
    )
  ) : null

  return (
    <AdaptiveWorkspace
      moduleKey="kits"
      primary={primary}
      contextual={contextual}
      contextualOpen={contextualOpen}
      onContextualOpenChange={(open) => {
        if (!open) closeContextual()
      }}
      contextualTitle={contextualTitle}
    />
  )
}
