import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import {
  adminEnsureKitImageFromComponents,
  adminPrimaryImageUrlMap,
} from '@/services/admin/adminImageService'
import {
  adminAddKitComponent,
  adminListKitComponents,
  adminListProducts,
  adminRemoveKitComponent,
  adminUpdateKitComponentQuantity,
  isKitCompositionPublishable,
  type AdminKitComponentRow,
} from '@/services/admin/adminProductService'
import type { Product } from '@/types'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  kitProductId: string
  compact?: boolean
  onChanged?: () => void
  onError?: (message: string) => void
  onMessage?: (message: string) => void
}

type Candidate = Product & { imageUrl?: string }

function errMsg(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message
  if (typeof e === 'object' && e && 'message' in e) {
    const m = String((e as { message: unknown }).message ?? '').trim()
    if (m) return m
  }
  return fallback
}

/** Seletor de itens do cadastro + BOM do kit (padrão guia / FAL). */
export function AdminProductKitSection({
  kitProductId,
  compact = false,
  onChanged,
  onError,
  onMessage,
}: Props) {
  const [rows, setRows] = useState<AdminKitComponentRow[]>([])
  const [rowQty, setRowQty] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [qty, setQty] = useState('1')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [searching, setSearching] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [pickedIds, setPickedIds] = useState<Set<string>>(() => new Set())
  const [rowThumbs, setRowThumbs] = useState<Record<string, string>>({})
  const [selectedPull, setSelectedPull] = useState<Record<string, boolean>>({})
  const [pulling, setPulling] = useState(false)
  const searchSeq = useRef(0)

  const publishable = useMemo(() => isKitCompositionPublishable(rows), [rows])
  const bomIds = useMemo(() => new Set(rows.map((r) => r.componentProductId)), [rows])
  const quantity = Number(String(qty).replace(',', '.')) || 1

  const progressLabel = publishable
    ? 'Composição mínima OK — pode liberar'
    : rows.length === 0
      ? 'Selecione itens do cadastro (mín. 2 linhas ou 1× qty ≥ 2)'
      : rows.length === 1 && rows[0]!.quantity < 2
        ? 'Falta 2ª linha ou aumentar qty ≥ 2 nesta linha'
        : 'Falta ao menos mais uma linha'

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const list = await adminListKitComponents(kitProductId)
      setRows(list)
      setRowQty(Object.fromEntries(list.map((c) => [c.id, String(c.quantity)])))
      const thumbs = await adminPrimaryImageUrlMap(list.map((r) => r.componentProductId))
      setRowThumbs(thumbs)
      setSelectedPull((prev) => {
        const next: Record<string, boolean> = {}
        for (const r of list) next[r.componentProductId] = prev[r.componentProductId] ?? true
        return next
      })
    } catch (e) {
      onError?.(errMsg(e, 'Falha ao carregar composição'))
    } finally {
      setLoading(false)
    }
  }, [kitProductId, onError])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    setHighlightedIndex(0)
    setPickedIds(new Set())
  }, [search, candidates.length])

  useEffect(() => {
    const term = search.trim()
    if (term.length < 2) {
      setCandidates([])
      setSearching(false)
      return
    }
    const seq = ++searchSeq.current
    const t = window.setTimeout(() => {
      void (async () => {
        setSearching(true)
        try {
          const found = await adminListProducts({ q: term, productKind: 'item', limit: 12 })
          if (seq !== searchSeq.current) return
          const items = found.filter((p) => p.id !== kitProductId && p.productKind !== 'kit')
          const urls = await adminPrimaryImageUrlMap(items.map((p) => p.id))
          if (seq !== searchSeq.current) return
          setCandidates(items.map((p) => ({ ...p, imageUrl: urls[p.id] })))
        } catch (e) {
          if (seq === searchSeq.current) {
            setCandidates([])
            onError?.(errMsg(e, 'Busca falhou'))
          }
        } finally {
          if (seq === searchSeq.current) setSearching(false)
        }
      })()
    }, 280)
    return () => window.clearTimeout(t)
  }, [search, kitProductId, onError])

  async function linkOne(match: Product, n: number) {
    await adminAddKitComponent(kitProductId, match.id, n)
  }

  async function linkComponent(match: Product, n: number) {
    setBusy(true)
    try {
      await linkOne(match, n)
      setSearch('')
      setQty('1')
      setCandidates([])
      setPickedIds(new Set())
      await reload()
      onMessage?.(
        bomIds.has(match.id)
          ? `Quantidade de ${match.sku} atualizada.`
          : `Item selecionado: ${match.sku}`,
      )
      onChanged?.()
    } catch (e) {
      onError?.(errMsg(e, 'Falha ao adicionar item'))
    } finally {
      setBusy(false)
    }
  }

  async function linkPickedBatch() {
    const toLink = candidates.filter((c) => pickedIds.has(c.id))
    if (!toLink.length) {
      onError?.('Marque ao menos um item na lista')
      return
    }
    if (!(quantity > 0)) {
      onError?.('Informe uma quantidade válida')
      return
    }
    setBusy(true)
    try {
      for (const match of toLink) {
        await linkOne(match, quantity)
      }
      setSearch('')
      setQty('1')
      setCandidates([])
      setPickedIds(new Set())
      await reload()
      onMessage?.(`${toLink.length} item(ns) do cadastro adicionados ao kit.`)
      onChanged?.()
    } catch (e) {
      onError?.(errMsg(e, 'Falha ao adicionar em lote'))
    } finally {
      setBusy(false)
    }
  }

  async function handleAddFromQuery() {
    const term = search.trim()
    if (!term) return
    if (!(quantity > 0)) {
      onError?.('Informe uma quantidade válida')
      return
    }
    const exact = candidates.find((p) => p.sku.toLowerCase() === term.toLowerCase())
    if (exact) {
      await linkComponent(exact, quantity)
      return
    }
    if (candidates.length > 0) {
      const pick = candidates[highlightedIndex] ?? candidates[0]
      if (pick) {
        await linkComponent(pick, quantity)
        return
      }
    }
    setBusy(true)
    try {
      const found = await adminListProducts({ q: term, productKind: 'item', limit: 8 })
      const match = found.find(
        (p) =>
          p.id !== kitProductId &&
          p.productKind !== 'kit' &&
          p.sku.toLowerCase() === term.toLowerCase(),
      )
      if (!match) {
        throw new Error(
          candidates.length
            ? 'Escolha o item na lista (Enter no destaque ou clique em Selecionar)'
            : 'Nenhum item do cadastro com esse SKU (só tipo Item)',
        )
      }
      await linkOne(match, quantity)
      setSearch('')
      setQty('1')
      setCandidates([])
      await reload()
      onMessage?.(`Item selecionado: ${match.sku}`)
      onChanged?.()
    } catch (e) {
      onError?.(errMsg(e, 'Não foi possível adicionar'))
    } finally {
      setBusy(false)
    }
  }

  async function saveQty(row: AdminKitComponentRow, raw: string) {
    const n = Number(String(raw).replace(',', '.'))
    if (!Number.isFinite(n) || n <= 0) {
      onError?.('Quantidade inválida')
      setRowQty((prev) => ({ ...prev, [row.id]: String(row.quantity) }))
      return
    }
    if (n === row.quantity) return
    setBusy(true)
    try {
      await adminUpdateKitComponentQuantity(row.id, n)
      await reload()
      onChanged?.()
    } catch (e) {
      onError?.(errMsg(e, 'Falha ao atualizar quantidade'))
      setRowQty((prev) => ({ ...prev, [row.id]: String(row.quantity) }))
    } finally {
      setBusy(false)
    }
  }

  function nudgeQty(row: AdminKitComponentRow, delta: number) {
    const current = Number((rowQty[row.id] ?? String(row.quantity)).replace(',', '.'))
    const next = Math.max(0.001, current + delta)
    setRowQty((prev) => ({ ...prev, [row.id]: String(next) }))
    void saveQty(row, String(next))
  }

  async function removeRow(row: AdminKitComponentRow) {
    if (!window.confirm(`Remover ${row.componentSku} do kit?`)) return
    setBusy(true)
    try {
      await adminRemoveKitComponent(row.id)
      await reload()
      onMessage?.('Item removido da composição.')
      onChanged?.()
    } catch (e) {
      onError?.(errMsg(e, 'Falha ao remover'))
    } finally {
      setBusy(false)
    }
  }

  async function pullSelectedPhotos() {
    const ids = rows
      .map((r) => r.componentProductId)
      .filter((id) => selectedPull[id] !== false)
    if (!ids.length) {
      onError?.('Selecione ao menos um item para puxar fotos')
      return
    }
    setPulling(true)
    try {
      const changed = await adminEnsureKitImageFromComponents(kitProductId, ids)
      onMessage?.(
        changed ? 'Fotos puxadas dos itens selecionados.' : 'Nada a sincronizar (já espelhadas).',
      )
      onChanged?.()
    } catch (e) {
      onError?.(errMsg(e, 'Falha ao puxar fotos'))
    } finally {
      setPulling(false)
    }
  }

  return (
    <section
      className={
        compact
          ? 'space-y-2 rounded-[12px] border border-hf-line bg-hf-surface p-2.5'
          : 'space-y-3 rounded-[14px] border border-hf-line bg-hf-surface p-4'
      }
      data-kit-bom-section
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`m-0 font-extrabold text-hf-ink ${compact ? 'text-sm' : 'text-base'}`}>
            Itens do kit
          </p>
          <p className="mb-0 mt-0.5 text-[11px] text-hf-muted">
            Selecione produtos já cadastrados (tipo Item). Enter · multi-seleção · qty na linha.
          </p>
        </div>
        <Button
          type="button"
          variant="light"
          size="sm"
          disabled={busy || pulling || rows.length === 0}
          onClick={() => void pullSelectedPhotos()}
        >
          {pulling ? 'Puxando…' : 'Puxar fotos'}
        </Button>
      </div>

      <p
        className={`m-0 rounded-[10px] border px-2.5 py-1.5 text-[11px] font-semibold ${
          publishable
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
            : 'border-amber-400/40 bg-amber-400/10 text-amber-200'
        }`}
      >
        {progressLabel}
      </p>

      <div className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1">
            <Input
              label="Buscar no cadastro (SKU / nome)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Digite 2+ letras…"
              disabled={busy}
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown' && candidates.length) {
                  e.preventDefault()
                  setHighlightedIndex((i) => Math.min(i + 1, candidates.length - 1))
                }
                if (e.key === 'ArrowUp' && candidates.length) {
                  e.preventDefault()
                  setHighlightedIndex((i) => Math.max(i - 1, 0))
                }
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleAddFromQuery()
                }
              }}
            />
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex w-[7.5rem] items-end gap-1">
              <button
                type="button"
                className="h-11 w-9 shrink-0 rounded-[8px] border border-hf-line text-hf-ink"
                disabled={busy}
                aria-label="Diminuir quantidade"
                onClick={() =>
                  setQty((v) => String(Math.max(1, (Number(String(v).replace(',', '.')) || 1) - 1)))
                }
              >
                −
              </button>
              <Input
                label="Qtd"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                disabled={busy}
              />
              <button
                type="button"
                className="h-11 w-9 shrink-0 rounded-[8px] border border-hf-line text-hf-ink"
                disabled={busy}
                aria-label="Aumentar quantidade"
                onClick={() =>
                  setQty((v) => String((Number(String(v).replace(',', '.')) || 1) + 1))
                }
              >
                +
              </button>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={busy || !search.trim()}
              onClick={() => void handleAddFromQuery()}
            >
              {busy ? '…' : 'Selecionar'}
            </Button>
            {pickedIds.size > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void linkPickedBatch()}
              >
                + {pickedIds.size} marcados
              </Button>
            ) : null}
          </div>
        </div>

        {search.trim().length >= 2 ? (
          <ul
            className="m-0 max-h-52 list-none space-y-1 overflow-y-auto rounded-[10px] border border-hf-line bg-hf-bg p-1.5"
            role="listbox"
            aria-label="Itens do cadastro para compor o kit"
          >
            {searching && candidates.length === 0 ? (
              <li className="px-2 py-1.5 text-xs text-hf-muted">Buscando no cadastro…</li>
            ) : null}
            {!searching && candidates.length === 0 ? (
              <li className="px-2 py-1.5 text-xs text-hf-muted">Nenhum item encontrado</li>
            ) : null}
            {candidates.map((c, index) => {
              const highlighted = index === highlightedIndex
              const already = bomIds.has(c.id)
              return (
                <li key={c.id} role="option" aria-selected={highlighted}>
                  <div
                    className={`flex w-full items-center gap-1.5 rounded-[8px] px-1 py-1 ${
                      highlighted ? 'bg-hf-red/15 ring-1 ring-hf-red/40' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="ml-0.5 h-4 w-4 shrink-0"
                      checked={pickedIds.has(c.id)}
                      disabled={busy}
                      aria-label={`Marcar ${c.sku}`}
                      onChange={() => {
                        setPickedIds((prev) => {
                          const next = new Set(prev)
                          if (next.has(c.id)) next.delete(c.id)
                          else next.add(c.id)
                          return next
                        })
                      }}
                    />
                    <button
                      type="button"
                      disabled={busy}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-[8px] px-1 py-1 text-left text-sm hover:bg-hf-surface"
                      onMouseEnter={() => setHighlightedIndex(index)}
                      onClick={() => void linkComponent(c, quantity > 0 ? quantity : 1)}
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-[6px] border border-hf-line bg-hf-surface">
                        {c.imageUrl ? (
                          <img src={c.imageUrl} alt="" className="h-full w-full object-contain" />
                        ) : (
                          <span className="text-[9px] text-hf-muted">sem foto</span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-xs font-bold text-hf-ink">
                          {c.sku}
                          {already ? (
                            <span className="ml-1 font-sans text-[10px] font-semibold text-amber-300">
                              já no kit
                            </span>
                          ) : null}
                        </span>
                        <span className="block truncate text-xs text-hf-muted">{c.name}</span>
                      </span>
                      <span className="shrink-0 text-[11px] font-extrabold text-hf-auth-link">
                        Selecionar
                      </span>
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>

      {loading ? (
        <p className="m-0 text-xs text-hf-muted">Carregando composição…</p>
      ) : rows.length === 0 ? (
        <p className="m-0 rounded-[10px] border border-dashed border-hf-line px-3 py-4 text-center text-xs text-hf-muted">
          Nenhum item ainda. Busque no cadastro acima e selecione.
        </p>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-2 rounded-[10px] border border-hf-line bg-hf-bg/60 px-2.5 py-2 sm:flex-row sm:flex-wrap sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <label className="inline-flex shrink-0 items-center" title="Incluir ao puxar fotos">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={selectedPull[row.componentProductId] !== false}
                    onChange={(e) =>
                      setSelectedPull((prev) => ({
                        ...prev,
                        [row.componentProductId]: e.target.checked,
                      }))
                    }
                  />
                </label>
                <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[8px] border border-hf-line bg-hf-surface">
                  {rowThumbs[row.componentProductId] ? (
                    <img
                      src={rowThumbs[row.componentProductId]}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-[9px] text-hf-muted">—</span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-sm font-semibold text-hf-ink">
                    <span className="font-mono text-xs">{row.componentSku}</span>
                    <span className="text-hf-muted"> · </span>
                    {row.componentName}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
                <button
                  type="button"
                  className="h-9 w-8 rounded-[8px] border border-hf-line text-hf-ink"
                  disabled={busy}
                  aria-label="Diminuir"
                  onClick={() => nudgeQty(row, -1)}
                >
                  −
                </button>
                <input
                  type="text"
                  inputMode="decimal"
                  className="h-9 w-14 rounded-[8px] border border-hf-line bg-hf-surface px-1.5 text-center text-sm text-hf-ink"
                  value={rowQty[row.id] ?? String(row.quantity)}
                  disabled={busy}
                  onChange={(e) =>
                    setRowQty((prev) => ({ ...prev, [row.id]: e.target.value }))
                  }
                  onBlur={(e) => void saveQty(row, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      ;(e.target as HTMLInputElement).blur()
                    }
                  }}
                />
                <button
                  type="button"
                  className="h-9 w-8 rounded-[8px] border border-hf-line text-hf-ink"
                  disabled={busy}
                  aria-label="Aumentar"
                  onClick={() => nudgeQty(row, 1)}
                >
                  +
                </button>
                <button
                  type="button"
                  className="min-h-9 px-2 text-xs font-semibold text-hf-danger"
                  disabled={busy}
                  onClick={() => void removeRow(row)}
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
