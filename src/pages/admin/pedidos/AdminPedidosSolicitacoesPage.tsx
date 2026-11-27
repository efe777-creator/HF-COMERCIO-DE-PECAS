import { GuideStackPanels } from '@/components/admin/workspace/GuideStackPanels'
import { AdaptiveWorkspace } from '@/components/admin/workspace/AdaptiveWorkspace'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { useAuth } from '@/contexts/AuthContext'
import { useIdSplitTabs } from '@/hooks/useIdSplitTabs'
import { adminListPaymentConditions } from '@/services/admin/adminPaymentConditionService'
import { adminListPriceLists } from '@/services/admin/adminPriceListService'
import { adminListSellers, type SellerRow } from '@/services/admin/adminSellerService'
import {
  approveCommercialLead,
  rejectCommercialLead,
} from '@/services/leads/commercialLeadService'
import { adminListLeads, type LeadRow } from '@/services/leads/leadService'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

function SolicitacaoGuide({
  lead,
  sellers,
  onPatched,
}: {
  lead: LeadRow
  sellers: SellerRow[]
  onPatched: (row: LeadRow) => void
}) {
  const { user } = useAuth()
  const [rejectReason, setRejectReason] = useState('')
  const [sellerId, setSellerId] = useState('')
  const [priceListId, setPriceListId] = useState('')
  const [conditionId, setConditionId] = useState('')
  const [priceLists, setPriceLists] = useState<{ id: string; name: string }[]>([])
  const [conditions, setConditions] = useState<{ id: string; name: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  useEffect(() => {
    void Promise.all([
      adminListPriceLists().catch(() => []),
      adminListPaymentConditions({ status: 'active' }).catch(() => []),
    ]).then(([pl, pc]) => {
      setPriceLists(
        (pl as { id: string; name?: string; title?: string }[]).map((p) => ({
          id: p.id,
          name: p.name || p.title || p.id.slice(0, 8),
        })),
      )
      setConditions(
        (pc as { id: string; name: string }[]).map((c) => ({ id: c.id, name: c.name })),
      )
    })
  }, [])

  const closed = Boolean(lead.rejected_at) || lead.status === 'won' || lead.status === 'lost'

  async function reject() {
    setBusy(true)
    setErr(null)
    try {
      await rejectCommercialLead({
        leadId: lead.id,
        reason: rejectReason,
        actorProfileId: user?.id,
      })
      onPatched({
        ...lead,
        status: 'lost',
        rejected_at: new Date().toISOString(),
        rejection_reason: rejectReason,
      })
      setOkMsg('Solicitação rejeitada')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao rejeitar')
    } finally {
      setBusy(false)
    }
  }

  async function approve() {
    setBusy(true)
    setErr(null)
    setOkMsg(null)
    try {
      const { customerId } = await approveCommercialLead({
        leadId: lead.id,
        defaultSellerId: sellerId,
        assignedPriceListId: priceListId,
        paymentConditionIds: conditionId ? [conditionId] : [],
        actorProfileId: user?.id,
      })
      onPatched({
        ...lead,
        status: 'won',
        customer_id: customerId,
      })
      setOkMsg(`Aprovado · cliente ${customerId.slice(0, 8)}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao aprovar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 p-1" data-admin-solicitacao-guide>
      <div>
        <p className="m-0 text-xs font-bold uppercase tracking-wide text-hf-muted">
          {lead.kind} · {lead.id.slice(0, 8)}
        </p>
        <h2 className="mt-1 mb-0 text-lg font-extrabold">{lead.company_name || lead.contact_name}</h2>
        <p className="mb-0 mt-1 text-xs text-hf-muted">
          CNPJ {lead.document || '—'} · {lead.business_profile || '—'} · {lead.interest || '—'}
        </p>
      </div>
      <div className="rounded-[10px] border border-hf-line bg-hf-bg px-3 py-2 text-sm">
        <p className="m-0 font-semibold">{lead.contact_name}</p>
        <p className="mb-0 mt-1 text-xs text-hf-muted">
          {[lead.contact_email, lead.contact_phone, lead.city, lead.state].filter(Boolean).join(' · ') ||
            '—'}
        </p>
      </div>
      {lead.message ? (
        <p className="m-0 whitespace-pre-wrap rounded-[10px] border border-hf-line px-3 py-2 text-sm">
          {lead.message}
        </p>
      ) : null}
      {lead.rejection_reason ? (
        <p className="m-0 text-sm text-hf-red">Rejeitada: {lead.rejection_reason}</p>
      ) : null}

      {!closed ? (
        <>
          <p className="m-0 text-sm font-extrabold">Aprovar (gates obrigatórios)</p>
          <label className="block text-xs font-semibold">
            Vendedor padrão *
            <select
              className="mt-1 w-full rounded-[10px] border border-hf-line bg-hf-surface px-2 py-2"
              value={sellerId}
              onChange={(e) => setSellerId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {sellers
                .filter((s) => s.status === 'active')
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block text-xs font-semibold">
            Lista de preço *
            <select
              className="mt-1 w-full rounded-[10px] border border-hf-line bg-hf-surface px-2 py-2"
              value={priceListId}
              onChange={(e) => setPriceListId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {priceLists.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold">
            Condição de pagamento *
            <select
              className="mt-1 w-full rounded-[10px] border border-hf-line bg-hf-surface px-2 py-2"
              value={conditionId}
              onChange={(e) => setConditionId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {conditions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" disabled={busy} onClick={() => void approve()}>
            Aprovar e ativar
          </Button>

          <hr className="border-hf-line" />
          <label className="block text-xs font-semibold">
            Motivo da rejeição
            <Input
              className="mt-1"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </label>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void reject()}>
            Rejeitar
          </Button>
        </>
      ) : null}
      {okMsg ? <p className="m-0 text-sm text-emerald-700">{okMsg}</p> : null}
      {err ? <p className="m-0 text-sm text-hf-red">{err}</p> : null}
    </div>
  )
}

export function AdminPedidosSolicitacoesPage() {
  const [params] = useSearchParams()
  const deepLead = params.get('lead')
  const [rows, setRows] = useState<LeadRow[]>([])
  const [sellers, setSellers] = useState<SellerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [onlyNew, setOnlyNew] = useState(true)
  const splitTabs = useIdSplitTabs()
  const [deepOpened, setDeepOpened] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [all, s] = await Promise.all([adminListLeads('all'), adminListSellers()])
      setRows(all.filter((r) => r.kind === 'partner' || r.kind === 'contact'))
      setSellers(s)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao listar')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => {
    if (deepOpened || !deepLead || !rows.length) return
    if (rows.some((r) => r.id === deepLead)) {
      splitTabs.openTab(deepLead)
      setDeepOpened(true)
    }
  }, [deepLead, deepOpened, rows, splitTabs])

  function patch(row: LeadRow) {
    setRows((prev) => prev.map((r) => (r.id === row.id ? row : r)))
  }

  const visible = useMemo(
    () => (onlyNew ? rows.filter((r) => r.status === 'new') : rows),
    [onlyNew, rows],
  )

  const primary = (
    <div className="space-y-3" data-admin-solicitacoes>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="m-0 text-xl font-extrabold sm:text-2xl">Solicitações</h1>
          <p className="mt-1 mb-0 text-xs text-hf-muted sm:text-sm">
            Cadastro comercial (partner/contact). Aprovação exige lista, condição e vendedor.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => void reload()}>
          Atualizar
        </Button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={onlyNew} onChange={(e) => setOnlyNew(e.target.checked)} />
        Só novas
      </label>
      {error ? <p className="m-0 text-sm text-hf-red">{error}</p> : null}
      {loading ? (
        <Loading />
      ) : visible.length === 0 ? (
        <p className="m-0 text-sm text-hf-muted">Nenhuma solicitação.</p>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {visible.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => splitTabs.openTab(r.id)}
                className="flex w-full items-center justify-between rounded-[12px] border border-hf-line bg-hf-surface px-3 py-3 text-left hover:border-hf-red/40"
              >
                <div>
                  <p className="m-0 text-sm font-extrabold">{r.company_name || r.contact_name}</p>
                  <p className="m-0 text-xs text-hf-muted">
                    {r.document || '—'} · {r.status} · {r.kind}
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

  return (
    <AdaptiveWorkspace
      moduleKey="pedidos"
      primary={primary}
      contextual={
        splitTabs.hasOpen ? (
          <GuideStackPanels
            ids={splitTabs.openIds}
            meta={splitTabs.openIds.map((id) => {
              const r = rows.find((x) => x.id === id)
              return { id, label: r?.company_name || r?.contact_name || id.slice(0, 8) }
            })}
            onCloseTab={splitTabs.closeTab}
            render={(id) => {
              const r = rows.find((x) => x.id === id)
              if (!r) return <p className="text-sm text-hf-muted">Não encontrada.</p>
              return <SolicitacaoGuide lead={r} sellers={sellers} onPatched={patch} />
            }}
          />
        ) : null
      }
      contextualOpen={splitTabs.hasOpen}
      onContextualOpenChange={(open) => {
        if (!open) splitTabs.closeAll()
      }}
      contextualTitle="Solicitação"
    />
  )
}
