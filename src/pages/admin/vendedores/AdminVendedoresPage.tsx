import { GuideStackPanels } from '@/components/admin/workspace/GuideStackPanels'
import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useIdSplitTabs } from '@/hooks/useIdSplitTabs'
import {
  adminListSellers,
  adminSetSellerStatus,
  adminUpsertSeller,
  type SellerRow,
  type SellerStatus,
} from '@/services/admin/adminSellerService'
import { useCallback, useEffect, useMemo, useState } from 'react'

function SellerGuide({
  seller,
  all,
  onPatched,
}: {
  seller: SellerRow
  all: SellerRow[]
  onPatched: (s: SellerRow) => void
}) {
  const [name, setName] = useState(seller.name)
  const [whatsapp, setWhatsapp] = useState(seller.whatsapp ?? '')
  const [email, setEmail] = useState(seller.email ?? '')
  const [phone, setPhone] = useState(seller.phone ?? '')
  const [reassignTo, setReassignTo] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    setName(seller.name)
    setWhatsapp(seller.whatsapp ?? '')
    setEmail(seller.email ?? '')
    setPhone(seller.phone ?? '')
  }, [seller])

  async function save() {
    setBusy(true)
    setErr(null)
    try {
      const next = await adminUpsertSeller({
        id: seller.id,
        name,
        whatsapp,
        email,
        phone,
        status: seller.status,
      })
      onPatched({ ...next, customerCount: seller.customerCount })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao salvar')
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(status: SellerStatus) {
    setBusy(true)
    setErr(null)
    try {
      await adminSetSellerStatus(
        seller.id,
        status,
        status === 'inactive' ? reassignTo || null : null,
      )
      onPatched({ ...seller, status })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao alterar status')
    } finally {
      setBusy(false)
    }
  }

  const others = all.filter((s) => s.id !== seller.id && s.status === 'active')

  return (
    <div className="space-y-3 p-1" data-admin-vendedor-guide>
      <h2 className="m-0 text-lg font-extrabold text-hf-ink">{seller.name}</h2>
      <p className="m-0 text-xs text-hf-muted">
        {seller.customerCount} cliente(s) · {seller.status === 'active' ? 'Ativo' : 'Inativo'}
      </p>
      <label className="block text-sm font-semibold">
        Nome
        <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block text-sm font-semibold">
        WhatsApp comercial
        <Input className="mt-1" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
      </label>
      <label className="block text-sm font-semibold">
        E-mail
        <Input className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="block text-sm font-semibold">
        Telefone
        <Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={() => void save()}>
          Salvar
        </Button>
        {seller.status === 'active' ? (
          <>
            {seller.customerCount > 0 ? (
              <label className="block text-xs font-semibold">
                Realocar para
                <select
                  className="mt-1 block rounded-[10px] border border-hf-line bg-hf-surface px-2 py-1"
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {others.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void setStatus('inactive')}
            >
              Inativar
            </Button>
          </>
        ) : (
          <Button type="button" variant="outline" disabled={busy} onClick={() => void setStatus('active')}>
            Reativar
          </Button>
        )}
      </div>
      {err ? <p className="m-0 text-sm text-hf-red">{err}</p> : null}
    </div>
  )
}

export function AdminVendedoresPage() {
  const [rows, setRows] = useState<SellerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'' | SellerStatus>('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newWa, setNewWa] = useState('')
  const splitTabs = useIdSplitTabs()

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminListSellers({ q, status }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao listar vendedores')
    } finally {
      setLoading(false)
    }
  }, [q, status])

  useEffect(() => {
    void reload()
  }, [reload])

  function patch(s: SellerRow) {
    setRows((prev) => prev.map((r) => (r.id === s.id ? s : r)))
  }

  async function create() {
    setCreating(true)
    setError(null)
    try {
      const s = await adminUpsertSeller({ name: newName, whatsapp: newWa })
      setRows((prev) => [s, ...prev])
      setNewName('')
      setNewWa('')
      splitTabs.openTab(s.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao criar')
    } finally {
      setCreating(false)
    }
  }

  const contextualOpen = splitTabs.hasOpen
  const contextualTitle = useMemo(() => {
    const id = splitTabs.activeId
    if (!id) return 'Vendedor'
    return rows.find((r) => r.id === id)?.name ?? 'Vendedor'
  }, [rows, splitTabs.activeId])

  const primary = (
    <div className="space-y-3" data-admin-vendedores>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="m-0 text-xl font-extrabold sm:text-2xl">Vendedores</h1>
          <p className="mt-1 mb-0 text-xs text-hf-muted sm:text-sm">
            Cadastro comercial (WhatsApp). Distinto de operadores.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void reload()}>
          Atualizar
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <select
          className="rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as '' | SellerStatus)}
        >
          <option value="">Todos</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
      </div>
      <div className="rounded-[12px] border border-hf-line bg-hf-surface p-3">
        <p className="m-0 mb-2 text-sm font-extrabold">Novo vendedor</p>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Nome"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="max-w-xs"
          />
          <Input
            placeholder="WhatsApp"
            value={newWa}
            onChange={(e) => setNewWa(e.target.value)}
            className="max-w-xs"
          />
          <Button type="button" disabled={creating || !newName.trim()} onClick={() => void create()}>
            Criar
          </Button>
        </div>
      </div>
      {error ? <p className="m-0 text-sm text-hf-red">{error}</p> : null}
      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <p className="m-0 text-sm text-hf-muted">Nenhum vendedor.</p>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => splitTabs.openTab(r.id)}
                className="flex w-full items-center justify-between rounded-[12px] border border-hf-line bg-hf-surface px-3 py-3 text-left hover:border-hf-red/40"
              >
                <div>
                  <p className="m-0 text-sm font-extrabold">{r.name}</p>
                  <p className="m-0 text-xs text-hf-muted">
                    {r.whatsapp || '—'} · {r.customerCount} cliente(s) ·{' '}
                    {r.status === 'active' ? 'Ativo' : 'Inativo'}
                  </p>
                </div>
                <span className="text-xs font-bold text-hf-muted">Abrir guia</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  const contextual = contextualOpen ? (
    <GuideStackPanels
      ids={splitTabs.openIds}
      meta={splitTabs.openIds.map((id) => {
        const r = rows.find((x) => x.id === id)
        return { id, label: r?.name ?? id.slice(0, 8) }
      })}
      onCloseTab={splitTabs.closeTab}
      render={(id) => {
        const r = rows.find((x) => x.id === id)
        if (!r) return <p className="text-sm text-hf-muted">Não encontrado.</p>
        return <SellerGuide seller={r} all={rows} onPatched={patch} />
      }}
    />
  ) : null

  return (
    <AdaptiveWorkspace
      moduleKey="vendedores"
      primary={primary}
      contextual={contextual}
      contextualOpen={contextualOpen}
      onContextualOpenChange={(open) => {
        if (!open) splitTabs.closeAll()
      }}
      contextualTitle={contextualTitle}
    />
  )
}
