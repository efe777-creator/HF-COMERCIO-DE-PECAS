import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { formatMoney } from '@/lib/money'
import {
  applyMethodAdjustment,
  formatMethodAdjustLabel,
  PAYMENT_METHOD_LABELS,
  type PaymentMethodKind,
} from '@/lib/paymentMethodAdjust'
import {
  describePaymentSchedule,
  resolvePaymentSchedule,
  type PaymentScheduleMode,
} from '@/lib/paymentSchedule'
import {
  adminGetPaymentCondition,
  adminReleasePaymentCondition,
  adminUpsertPaymentCondition,
  type AdminPaymentCondition,
  type AdminPaymentInstallment,
  type AdminPaymentMethod,
} from '@/services/admin/adminPaymentConditionService'
import { useCallback, useEffect, useMemo, useState } from 'react'

export const FIN_GUIDE_MENU_KEY = 'hf.financeiro.guideMenu'

export type FinGuideMenuId =
  | 'identidade'
  | 'agenda'
  | 'meios'
  | 'disponibilidade'
  | 'simular'

const GUIDE_MENUS: { id: FinGuideMenuId; label: string }[] = [
  { id: 'identidade', label: 'Identidade' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'meios', label: 'Meios' },
  { id: 'disponibilidade', label: 'Disponibilidade' },
  { id: 'simular', label: 'Simular' },
]

const METHOD_ORDER: PaymentMethodKind[] = ['pix', 'debit', 'credit', 'boleto', 'cash']

function readGuideMenu(): FinGuideMenuId {
  try {
    const v = sessionStorage.getItem(FIN_GUIDE_MENU_KEY)
    if (GUIDE_MENUS.some((m) => m.id === v)) return v as FinGuideMenuId
  } catch {
    /* ignore */
  }
  return 'identidade'
}

function persistGuideMenu(id: FinGuideMenuId) {
  try {
    sessionStorage.setItem(FIN_GUIDE_MENU_KEY, id)
  } catch {
    /* ignore */
  }
}

function errMsg(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message
  if (typeof e === 'object' && e && 'message' in e) {
    const m = String((e as { message: unknown }).message ?? '').trim()
    if (m) return m
  }
  return fallback
}

function emptyMethods(): AdminPaymentMethod[] {
  return METHOD_ORDER.map((method, i) => ({
    method,
    enabled: method === 'pix' || method === 'boleto',
    adjustKind: 'none',
    adjustSign: 'surcharge',
    adjustValue: 0,
    sortOrder: (i + 1) * 10,
  }))
}

type Draft = {
  code: string
  name: string
  description: string
  footnote: string
  scheduleMode: PaymentScheduleMode
  installmentCount: number
  equalIntervalDays: number
  firstDueDays: number
  weekday: number | ''
  weekdayIntervalWeeks: number
  businessDayRule: 'none' | 'next_business' | 'prev_business'
  minSubtotal: string
  showToGuests: boolean
  showToCustomers: boolean
  sortOrder: number
  installments: AdminPaymentInstallment[]
  methods: AdminPaymentMethod[]
}

function fromCondition(c: AdminPaymentCondition): Draft {
  return {
    code: c.code,
    name: c.name,
    description: c.description ?? '',
    footnote: c.footnote ?? '',
    scheduleMode: c.scheduleMode,
    installmentCount: c.installmentCount,
    equalIntervalDays: c.equalIntervalDays ?? 15,
    firstDueDays: c.firstDueDays,
    weekday: c.weekday ?? '',
    weekdayIntervalWeeks: c.weekdayIntervalWeeks ?? 2,
    businessDayRule: c.businessDayRule,
    minSubtotal: c.minSubtotal != null ? String(c.minSubtotal) : '',
    showToGuests: c.showToGuests,
    showToCustomers: c.showToCustomers,
    sortOrder: c.sortOrder,
    installments: c.installments.length
      ? c.installments
      : [{ seq: 1, offsetDays: 0, percent: 100, label: null }],
    methods: c.methods.length ? c.methods : emptyMethods(),
  }
}

function blankDraft(): Draft {
  return {
    code: '',
    name: '',
    description: '',
    footnote: '',
    scheduleMode: 'single',
    installmentCount: 1,
    equalIntervalDays: 15,
    firstDueDays: 0,
    weekday: '',
    weekdayIntervalWeeks: 2,
    businessDayRule: 'none',
    minSubtotal: '',
    showToGuests: false,
    showToCustomers: true,
    sortOrder: 0,
    installments: [{ seq: 1, offsetDays: 0, percent: 100, label: null }],
    methods: emptyMethods(),
  }
}

type Props = {
  quickCreate?: boolean
  focused?: AdminPaymentCondition | null
  busy?: boolean
  onClose: () => void
  onCreated?: (c: AdminPaymentCondition) => void
  onUpdated?: (c: AdminPaymentCondition) => void
}

export function PaymentConditionWorkSurface({
  quickCreate = false,
  focused = null,
  busy,
  onClose,
  onCreated,
  onUpdated,
}: Props) {
  const [menu, setMenu] = useState<FinGuideMenuId>(readGuideMenu)
  const [condition, setCondition] = useState<AdminPaymentCondition | null>(null)
  const [draft, setDraft] = useState<Draft>(blankDraft)
  const [loading, setLoading] = useState(!quickCreate && Boolean(focused?.id))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [simDate, setSimDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [simBase, setSimBase] = useState('100')
  const [simMethod, setSimMethod] = useState<PaymentMethodKind>('pix')

  const load = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const row = await adminGetPaymentCondition(id)
      if (!row) throw new Error('Condição não encontrada')
      setCondition(row)
      setDraft(fromCondition(row))
    } catch (e) {
      setError(errMsg(e, 'Falha ao carregar'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (quickCreate) {
      setCondition(null)
      setDraft(blankDraft())
      setLoading(false)
      return
    }
    if (focused?.id) void load(focused.id)
  }, [quickCreate, focused?.id, load])

  function setMenuSafe(id: FinGuideMenuId) {
    setMenu(id)
    persistGuideMenu(id)
  }

  async function save(asStatus?: 'draft' | 'published'): Promise<AdminPaymentCondition | null> {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const min =
        draft.minSubtotal.trim() === '' ? null : Number(draft.minSubtotal.replace(',', '.'))
      const saved = await adminUpsertPaymentCondition({
        id: condition?.id,
        code: draft.code,
        name: draft.name,
        description: draft.description,
        footnote: draft.footnote,
        scheduleMode: draft.scheduleMode,
        installmentCount: draft.installmentCount,
        equalIntervalDays:
          draft.scheduleMode === 'equal_interval' ? draft.equalIntervalDays : null,
        firstDueDays: draft.firstDueDays,
        weekday: draft.weekday === '' ? null : Number(draft.weekday),
        weekdayIntervalWeeks:
          draft.scheduleMode === 'weekday_cycle' ? draft.weekdayIntervalWeeks : null,
        businessDayRule: draft.businessDayRule,
        status: asStatus ?? condition?.status ?? 'draft',
        minSubtotal: min != null && Number.isFinite(min) ? min : null,
        showToGuests: draft.showToGuests,
        showToCustomers: draft.showToCustomers,
        sortOrder: draft.sortOrder,
        installments: draft.installments,
        methods: draft.methods,
      })
      setCondition(saved)
      setDraft(fromCondition(saved))
      setMessage('Salvo.')
      if (condition?.id) onUpdated?.(saved)
      else onCreated?.(saved)
      return saved
    } catch (e) {
      setError(errMsg(e, 'Falha ao salvar'))
      return null
    } finally {
      setSaving(false)
    }
  }

  async function liberar() {
    if (!condition?.id) {
      await save('published')
      return
    }
    if (!window.confirm('Liberar condição para clientes? (status → published)')) return
    setSaving(true)
    setError(null)
    try {
      await save()
      const pub = await adminReleasePaymentCondition(condition.id)
      setCondition(pub)
      setDraft(fromCondition(pub))
      setMessage('Liberada.')
      onUpdated?.(pub)
    } catch (e) {
      setError(errMsg(e, 'Falha ao liberar'))
    } finally {
      setSaving(false)
    }
  }

  const schedulePreview = useMemo(() => {
    const anchor = new Date(simDate + 'T12:00:00')
    return resolvePaymentSchedule(
      {
        scheduleMode: draft.scheduleMode,
        installmentCount: draft.installmentCount,
        equalIntervalDays: draft.equalIntervalDays,
        firstDueDays: draft.firstDueDays,
        weekday: draft.weekday === '' ? null : Number(draft.weekday),
        weekdayIntervalWeeks: draft.weekdayIntervalWeeks,
        businessDayRule: draft.businessDayRule,
        amountSplit: 'equal',
        installments: draft.installments.map((r) => ({
          seq: r.seq,
          offsetDays: r.offsetDays,
          percent: r.percent,
          label: r.label,
        })),
      },
      anchor,
    )
  }, [draft, simDate])

  const baseNum = Number(String(simBase).replace(',', '.')) || 0
  const methodRow = draft.methods.find((m) => m.method === simMethod)
  const adjusted = methodRow
    ? applyMethodAdjustment(baseNum, {
        adjustKind: methodRow.adjustKind,
        adjustSign: methodRow.adjustSign,
        adjustValue: methodRow.adjustValue,
      })
    : baseNum

  if (quickCreate && !condition) {
    return (
      <div className="space-y-3 text-sm" data-fin-guide-menus data-fin-ops-density="compact">
        <div className="rounded-[12px] border border-hf-line bg-hf-bg/50 p-3">
          <p className="m-0 text-xs text-hf-muted">Criar na guia</p>
          <p className="mb-0 mt-1 text-sm font-extrabold text-hf-ink">Nova condição (mínimo)</p>
          <p className="mb-0 mt-1 text-[11px] text-hf-muted">
            Código e nome → salva rascunho e abre Agenda / Meios.
          </p>
        </div>
        {error ? <p className="m-0 text-xs text-hf-danger">{error}</p> : null}
        {message ? <p className="m-0 text-xs font-semibold text-emerald-700">{message}</p> : null}
        <div className="space-y-2 rounded-[12px] border border-hf-line bg-hf-surface p-3">
          <Input
            label="Código"
            value={draft.code}
            onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))}
            required
          />
          <Input
            label="Nome"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            required
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              type="button"
              size="sm"
              disabled={saving || !draft.code.trim() || !draft.name.trim()}
              onClick={() => {
                persistGuideMenu('agenda')
                void save('draft')
              }}
            >
              {saving ? 'Salvando…' : 'Salvar e configurar'}
            </Button>
            <Button type="button" variant="light" size="sm" onClick={onClose}>
              Fechar guia
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return <Loading label="Carregando condição…" />
  }

  return (
    <div className="space-y-3 text-sm" data-fin-guide-menus data-fin-ops-density="compact">
      <div className="rounded-[12px] border border-hf-line bg-hf-bg/50 p-3">
        <p className="m-0 text-xs text-hf-muted">Código</p>
        <p className="m-0 font-mono text-xs font-bold">{draft.code || '—'}</p>
        <p className="m-0 mt-1 font-extrabold text-hf-ink">{draft.name || 'Sem nome'}</p>
        <p className="m-0 mt-1 text-xs text-hf-muted">
          {condition?.status === 'published' ? 'Publicada' : 'Rascunho'}
          {draft.showToGuests ? ' · visitantes' : ''}
          {draft.showToCustomers ? ' · clientes' : ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="light"
          disabled={saving || busy}
          onClick={() => void save()}
        >
          Salvar
        </Button>
        <Button type="button" size="sm" disabled={saving || busy} onClick={() => void liberar()}>
          Liberar
        </Button>
        <Button type="button" variant="light" size="sm" onClick={onClose}>
          Fechar guia
        </Button>
      </div>

      <div className="flex flex-wrap gap-1" data-fin-guide-menu-pills>
        {GUIDE_MENUS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={[
              'rounded-full px-3 py-1 text-xs font-bold',
              menu === m.id ? 'bg-hf-red text-white' : 'bg-hf-bg text-hf-ink hover:bg-hf-line/40',
            ].join(' ')}
            onClick={() => setMenuSafe(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="min-h-0">
        {error ? <p className="mb-2 text-xs text-hf-danger">{error}</p> : null}
        {message ? <p className="mb-2 text-xs font-semibold text-emerald-700">{message}</p> : null}

        {menu === 'identidade' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Código"
              value={draft.code}
              onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))}
              required
            />
            <Input
              label="Nome"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              required
            />
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-bold text-hf-muted">Descrição</label>
              <textarea
                className="w-full rounded-[10px] border border-hf-line px-3 py-2 text-sm"
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Rodapé / footnote"
                value={draft.footnote}
                onChange={(e) => setDraft((d) => ({ ...d, footnote: e.target.value }))}
              />
            </div>
          </div>
        ) : null}

        {menu === 'agenda' ? (
          <div className="space-y-3">
            <label className="block text-xs font-bold text-hf-muted">Modo</label>
            <select
              className="w-full rounded-[10px] border border-hf-line px-3 py-2 text-sm"
              value={draft.scheduleMode}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  scheduleMode: e.target.value as PaymentScheduleMode,
                }))
              }
            >
              <option value="single">Único (à vista / DDL)</option>
              <option value="equal_interval">Parcelas intervalo igual</option>
              <option value="custom_offsets">Offsets custom (ex. 7/14)</option>
              <option value="weekday_cycle">Ciclo por dia da semana</option>
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Qtd. parcelas"
                type="number"
                min={1}
                max={48}
                value={String(draft.installmentCount)}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    installmentCount: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
              />
              <Input
                label="Dias até 1ª / DDL"
                type="number"
                min={0}
                value={String(draft.firstDueDays)}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, firstDueDays: Math.max(0, Number(e.target.value) || 0) }))
                }
              />
              {draft.scheduleMode === 'equal_interval' ? (
                <Input
                  label="Intervalo (dias)"
                  type="number"
                  min={0}
                  value={String(draft.equalIntervalDays)}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      equalIntervalDays: Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                />
              ) : null}
              {draft.scheduleMode === 'weekday_cycle' ? (
                <>
                  <label className="block text-xs font-bold text-hf-muted">
                    Dia da semana
                    <select
                      className="mt-1 w-full rounded-[10px] border border-hf-line px-3 py-2 text-sm font-normal text-hf-ink"
                      value={draft.weekday === '' ? '5' : String(draft.weekday)}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, weekday: Number(e.target.value) }))
                      }
                    >
                      <option value="0">Domingo</option>
                      <option value="1">Segunda</option>
                      <option value="2">Terça</option>
                      <option value="3">Quarta</option>
                      <option value="4">Quinta</option>
                      <option value="5">Sexta</option>
                      <option value="6">Sábado</option>
                    </select>
                  </label>
                  <Input
                    label="Intervalo (semanas)"
                    type="number"
                    min={1}
                    value={String(draft.weekdayIntervalWeeks)}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        weekdayIntervalWeeks: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                  />
                </>
              ) : null}
              <label className="block text-xs font-bold text-hf-muted">
                Dia útil
                <select
                  className="mt-1 w-full rounded-[10px] border border-hf-line px-3 py-2 text-sm font-normal text-hf-ink"
                  value={draft.businessDayRule}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      businessDayRule: e.target.value as Draft['businessDayRule'],
                    }))
                  }
                >
                  <option value="none">Sem ajuste</option>
                  <option value="next_business">Próximo útil</option>
                  <option value="prev_business">Útil anterior</option>
                </select>
              </label>
            </div>

            {draft.scheduleMode === 'custom_offsets' ? (
              <div className="space-y-2">
                <p className="m-0 text-xs font-bold text-hf-muted">Offsets (dias a partir da âncora)</p>
                {draft.installments.map((row, idx) => (
                  <div key={row.seq} className="flex flex-wrap items-end gap-2">
                    <Input
                      label={`Parcela ${idx + 1}`}
                      type="number"
                      min={0}
                      value={String(row.offsetDays)}
                      onChange={(e) => {
                        const v = Math.max(0, Number(e.target.value) || 0)
                        setDraft((d) => {
                          const installments = d.installments.slice()
                          installments[idx] = { ...row, offsetDays: v, seq: idx + 1 }
                          return { ...d, installments }
                        })
                      }}
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="light"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      installmentCount: d.installments.length + 1,
                      installments: [
                        ...d.installments,
                        {
                          seq: d.installments.length + 1,
                          offsetDays: (d.installments.at(-1)?.offsetDays ?? 0) + 7,
                          percent: null,
                          label: null,
                        },
                      ],
                    }))
                  }
                >
                  + Parcela
                </Button>
              </div>
            ) : null}

            <p className="m-0 text-sm text-hf-muted">
              Resumo:{' '}
              {describePaymentSchedule({
                scheduleMode: draft.scheduleMode,
                installmentCount: draft.installmentCount,
                equalIntervalDays: draft.equalIntervalDays,
                firstDueDays: draft.firstDueDays,
                weekday: draft.weekday === '' ? null : Number(draft.weekday),
                weekdayIntervalWeeks: draft.weekdayIntervalWeeks,
                businessDayRule: draft.businessDayRule,
                amountSplit: 'equal',
                installments: draft.installments.map((r) => ({
                  seq: r.seq,
                  offsetDays: r.offsetDays,
                  percent: r.percent,
                  label: r.label,
                })),
              })}
            </p>
          </div>
        ) : null}

        {menu === 'meios' ? (
          <div className="space-y-3">
            <p className="m-0 text-sm text-hf-muted">
              Habilite meios e defina acréscimo ou desconto (% ou R$) sobre o preço da lista.
            </p>
            {draft.methods.map((m, idx) => (
              <div
                key={m.method}
                className="grid gap-2 rounded-[12px] border border-hf-line bg-hf-bg p-3 sm:grid-cols-4"
              >
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={m.enabled}
                    onChange={(e) =>
                      setDraft((d) => {
                        const methods = d.methods.slice()
                        methods[idx] = { ...m, enabled: e.target.checked }
                        return { ...d, methods }
                      })
                    }
                  />
                  {PAYMENT_METHOD_LABELS[m.method]}
                </label>
                <select
                  className="rounded-[10px] border border-hf-line px-2 py-1.5 text-sm"
                  value={m.adjustKind}
                  disabled={!m.enabled}
                  onChange={(e) =>
                    setDraft((d) => {
                      const methods = d.methods.slice()
                      methods[idx] = {
                        ...m,
                        adjustKind: e.target.value as AdminPaymentMethod['adjustKind'],
                      }
                      return { ...d, methods }
                    })
                  }
                >
                  <option value="none">Sem ajuste</option>
                  <option value="percent">Percentual</option>
                  <option value="fixed">Valor R$</option>
                </select>
                <select
                  className="rounded-[10px] border border-hf-line px-2 py-1.5 text-sm"
                  value={m.adjustSign}
                  disabled={!m.enabled || m.adjustKind === 'none'}
                  onChange={(e) =>
                    setDraft((d) => {
                      const methods = d.methods.slice()
                      methods[idx] = {
                        ...m,
                        adjustSign: e.target.value as AdminPaymentMethod['adjustSign'],
                      }
                      return { ...d, methods }
                    })
                  }
                >
                  <option value="surcharge">Acréscimo</option>
                  <option value="discount">Desconto</option>
                </select>
                <Input
                  label="Valor"
                  type="number"
                  min={0}
                  step="0.01"
                  disabled={!m.enabled || m.adjustKind === 'none'}
                  value={String(m.adjustValue)}
                  onChange={(e) =>
                    setDraft((d) => {
                      const methods = d.methods.slice()
                      methods[idx] = {
                        ...m,
                        adjustValue: Math.max(0, Number(e.target.value) || 0),
                      }
                      return { ...d, methods }
                    })
                  }
                />
              </div>
            ))}
          </div>
        ) : null}

        {menu === 'disponibilidade' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={draft.showToGuests}
                onChange={(e) => setDraft((d) => ({ ...d, showToGuests: e.target.checked }))}
              />
              Visível a visitantes (texto)
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={draft.showToCustomers}
                onChange={(e) => setDraft((d) => ({ ...d, showToCustomers: e.target.checked }))}
              />
              Visível a clientes B2B
            </label>
            <Input
              label="Mín. subtotal (R$) — opcional"
              value={draft.minSubtotal}
              onChange={(e) => setDraft((d) => ({ ...d, minSubtotal: e.target.value }))}
              placeholder="Ex.: 500"
            />
            <Input
              label="Ordem"
              type="number"
              value={String(draft.sortOrder)}
              onChange={(e) =>
                setDraft((d) => ({ ...d, sortOrder: Number(e.target.value) || 0 }))
              }
            />
          </div>
        ) : null}

        {menu === 'simular' ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label="Data âncora"
                type="date"
                value={simDate}
                onChange={(e) => setSimDate(e.target.value)}
              />
              <Input
                label="Preço base (lista)"
                value={simBase}
                onChange={(e) => setSimBase(e.target.value)}
              />
              <label className="block text-xs font-bold text-hf-muted">
                Meio
                <select
                  className="mt-1 w-full rounded-[10px] border border-hf-line px-3 py-2 text-sm font-normal text-hf-ink"
                  value={simMethod}
                  onChange={(e) => setSimMethod(e.target.value as PaymentMethodKind)}
                >
                  {METHOD_ORDER.map((m) => (
                    <option key={m} value={m}>
                      {PAYMENT_METHOD_LABELS[m]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="m-0 text-sm">
              Preço refletido:{' '}
              <strong>{formatMoney(adjusted)}</strong>
              {methodRow ? (
                <span className="text-hf-muted"> ({formatMethodAdjustLabel(methodRow)})</span>
              ) : null}
            </p>
            <ul className="m-0 list-none space-y-1 p-0">
              {schedulePreview.map((line) => (
                <li
                  key={line.seq}
                  className="rounded-[10px] border border-hf-line bg-hf-bg px-3 py-2 text-sm"
                >
                  #{line.seq} · {line.dueDate.toLocaleDateString('pt-BR')} · {line.percent}% ·{' '}
                  {formatMoney((adjusted * line.percent) / 100)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}
