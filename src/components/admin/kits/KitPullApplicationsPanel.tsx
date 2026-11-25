import { Button } from '@/components/common/Button'
import {
  adminListKitComponents,
  adminPullKitApplicationsFromComponents,
  type AdminKitComponentRow,
} from '@/services/admin/adminProductService'
import { useCallback, useEffect, useState } from 'react'

type Props = {
  kitProductId: string
  onPulled?: () => void
  onError?: (message: string) => void
  onMessage?: (message: string) => void
}

/** Seleciona componentes do BOM e copia PVC para o kit. */
export function KitPullApplicationsPanel({
  kitProductId,
  onPulled,
  onError,
  onMessage,
}: Props) {
  const [rows, setRows] = useState<AdminKitComponentRow[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    try {
      const list = await adminListKitComponents(kitProductId)
      setRows(list)
      setSelected((prev) => {
        const next: Record<string, boolean> = {}
        for (const r of list) next[r.componentProductId] = prev[r.componentProductId] ?? true
        return next
      })
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Falha ao listar componentes')
    }
  }, [kitProductId, onError])

  useEffect(() => {
    void reload()
  }, [reload])

  async function pull() {
    const ids = rows
      .map((r) => r.componentProductId)
      .filter((id) => selected[id] !== false)
    if (!ids.length) {
      onError?.('Selecione ao menos um item')
      return
    }
    setBusy(true)
    try {
      const result = await adminPullKitApplicationsFromComponents({
        kitProductId,
        componentProductIds: ids,
      })
      onMessage?.(
        `Aplicações: ${result.inserted} nova(s), ${result.updated} atualizada(s)` +
          (result.skipped ? `, ${result.skipped} ignorada(s)` : '') +
          '.',
      )
      onPulled?.()
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Falha ao puxar aplicações')
    } finally {
      setBusy(false)
    }
  }

  if (rows.length === 0) {
    return (
      <p className="m-0 text-xs text-hf-muted">
        Monte a composição para puxar aplicações dos itens.
      </p>
    )
  }

  return (
    <div className="space-y-2 rounded-[10px] border border-hf-line bg-hf-surface-2 p-3">
      <p className="m-0 text-xs font-extrabold text-hf-ink">Puxar aplicações dos itens</p>
      <p className="m-0 text-[11px] text-hf-muted">
        Copia PVC dos componentes escolhidos para este kit (não herda sozinho ao mudar o BOM).
      </p>
      <ul className="m-0 max-h-36 space-y-1 overflow-y-auto p-0 list-none text-xs">
        {rows.map((r) => (
          <li key={r.id}>
            <label className="inline-flex items-center gap-2 text-hf-ink">
              <input
                type="checkbox"
                checked={selected[r.componentProductId] !== false}
                onChange={(e) =>
                  setSelected((prev) => ({
                    ...prev,
                    [r.componentProductId]: e.target.checked,
                  }))
                }
              />
              <span>
                <strong className="font-mono">{r.componentSku}</strong> · {r.componentName}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <Button type="button" variant="light" disabled={busy} onClick={() => void pull()}>
        {busy ? 'Puxando…' : 'Puxar aplicações selecionadas'}
      </Button>
    </div>
  )
}
