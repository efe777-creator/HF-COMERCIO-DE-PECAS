import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { Select } from '@/components/common/Select'
import { lookupBrasilApiCnpj, type BrasilApiCnpjLookup } from '@/lib/brasilApiCnpj'
import { BR_UF_OPTIONS, macroRegionFromUf } from '@/lib/brMacroRegion'
import { formatCnpj, isValidCnpj, onlyDigits } from '@/lib/cnpj'
import { describePaymentSchedule } from '@/lib/paymentSchedule'
import { formatCep, lookupViaCep, onlyCepDigits } from '@/lib/viaCep'
import {
  adminGetB2bCustomer,
  adminLinkUserToCustomer,
  adminListCustomerUsers,
  adminSetCustomerUserPrimary,
  adminUnlinkUserFromCustomer,
  adminUpsertB2bCustomer,
  type AdminB2bCustomer,
  type AdminCustomerGroup,
  type AdminCustomerUserLink,
  type CustomerStatus,
  type IeIndicator,
} from '@/services/admin/adminB2bCustomerService'
import {
  adminAssignCatalogToCustomer,
  adminListCatalogs,
  adminListCustomerCatalogIds,
  type AdminCatalogList,
} from '@/services/admin/adminCatalogListService'
import {
  adminSearchUsers,
  type AdminOperatorUserRow,
} from '@/services/admin/adminOperatorsService'
import {
  adminListPaymentConditions,
  type AdminPaymentCondition,
} from '@/services/admin/adminPaymentConditionService'
import { adminListPriceLists, type PriceList } from '@/services/admin/adminPriceListService'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export const CUST_GUIDE_MENU_KEY = 'hf.customers.guideMenu'

export type CustGuideMenuId =
  | 'identidade'
  | 'contato'
  | 'endereco'
  | 'comercial'
  | 'acesso'
  | 'credito'

const GUIDE_MENUS: { id: CustGuideMenuId; label: string }[] = [
  { id: 'identidade', label: 'Identidade' },
  { id: 'contato', label: 'Contato' },
  { id: 'endereco', label: 'Endereço' },
  { id: 'comercial', label: 'Comercial' },
  { id: 'acesso', label: 'Acesso' },
  { id: 'credito', label: 'Crédito' },
]

const STATUSES: CustomerStatus[] = ['pending', 'active', 'suspended', 'inactive']

function readGuideMenu(): CustGuideMenuId {
  try {
    const v = sessionStorage.getItem(CUST_GUIDE_MENU_KEY)
    if (GUIDE_MENUS.some((m) => m.id === v)) return v as CustGuideMenuId
  } catch {
    /* ignore */
  }
  return 'identidade'
}

function persistGuideMenu(id: CustGuideMenuId) {
  try {
    sessionStorage.setItem(CUST_GUIDE_MENU_KEY, id)
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

type Draft = {
  legalName: string
  tradeName: string
  cnpj: string
  notes: string
  stateRegistration: string
  ieIndicator: IeIndicator | ''
  cnpjStatus: string
  cnpjCheckedAt: string
  cnaeCode: string
  contactName: string
  email: string
  phone: string
  whatsapp: string
  postalCode: string
  street: string
  number: string
  complement: string
  district: string
  city: string
  state: string
  ibgeCode: string
  macroRegion: string
  status: CustomerStatus
  groupId: string
  assignedPriceListId: string
  paymentConditionIds: string[]
}

function emptyDraft(): Draft {
  return {
    legalName: '',
    tradeName: '',
    cnpj: '',
    notes: '',
    stateRegistration: '',
    ieIndicator: '',
    cnpjStatus: '',
    cnpjCheckedAt: '',
    cnaeCode: '',
    contactName: '',
    email: '',
    phone: '',
    whatsapp: '',
    postalCode: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
    ibgeCode: '',
    macroRegion: '',
    status: 'pending',
    groupId: '',
    assignedPriceListId: '',
    paymentConditionIds: [],
  }
}

function fromCustomer(c: AdminB2bCustomer): Draft {
  const a = c.address
  return {
    legalName: c.legalName,
    tradeName: c.tradeName ?? '',
    cnpj: c.cnpj ? formatCnpj(c.cnpj) : '',
    notes: c.notes ?? '',
    stateRegistration: c.stateRegistration ?? '',
    ieIndicator: c.ieIndicator ?? '',
    cnpjStatus: c.cnpjStatus ?? '',
    cnpjCheckedAt: c.cnpjCheckedAt ?? '',
    cnaeCode: c.cnaeCode ?? '',
    contactName: c.contactName ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    whatsapp: c.whatsapp ?? '',
    postalCode: a?.postalCode ? formatCep(a.postalCode) : '',
    street: a?.street ?? '',
    number: a?.number ?? '',
    complement: a?.complement ?? '',
    district: a?.district ?? '',
    city: a?.city ?? '',
    state: a?.state ?? '',
    ibgeCode: a?.ibgeCode ?? '',
    macroRegion: a?.macroRegion ?? '',
    status: c.status,
    groupId: c.groupId ?? '',
    assignedPriceListId: c.assignedPriceListId ?? '',
    paymentConditionIds: c.paymentConditionIds ?? [],
  }
}

type Props = {
  customerId: string | null
  groups: AdminCustomerGroup[]
  onSaved: (c: AdminB2bCustomer) => void
  onClose: () => void
}

export function CustomerWorkSurface({ customerId, groups, onSaved, onClose }: Props) {
  const isCreate = !customerId
  const [menu, setMenu] = useState<CustGuideMenuId>(readGuideMenu)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [loading, setLoading] = useState(!isCreate)
  const [saving, setSaving] = useState(false)
  const [lookingCnpj, setLookingCnpj] = useState(false)
  const [lookingCep, setLookingCep] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cnpjPreview, setCnpjPreview] = useState<BrasilApiCnpjLookup | null>(null)
  const [priceLists, setPriceLists] = useState<PriceList[]>([])
  const [paymentConditions, setPaymentConditions] = useState<AdminPaymentCondition[]>([])
  const [catalogs, setCatalogs] = useState<AdminCatalogList[]>([])
  const [assignedCatalogs, setAssignedCatalogs] = useState<string[]>([])
  const [catalogId, setCatalogId] = useState('')
  const [linkedUsers, setLinkedUsers] = useState<AdminCustomerUserLink[]>([])
  const [userQuery, setUserQuery] = useState('')
  const [userHits, setUserHits] = useState<AdminOperatorUserRow[]>([])
  const [userSearching, setUserSearching] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(customerId)

  const setMenuPersist = (id: CustGuideMenuId) => {
    setMenu(id)
    persistGuideMenu(id)
  }

  const patch = (partial: Partial<Draft>) => setDraft((d) => ({ ...d, ...partial }))

  const togglePaymentCondition = (id: string) => {
    setDraft((d) => {
      const has = d.paymentConditionIds.includes(id)
      return {
        ...d,
        paymentConditionIds: has
          ? d.paymentConditionIds.filter((x) => x !== id)
          : [...d.paymentConditionIds, id],
      }
    })
  }

  const loadAccess = useCallback(async (id: string) => {
    const [cats, users, lists, allCats, conds] = await Promise.all([
      adminListCustomerCatalogIds(id),
      adminListCustomerUsers(id),
      adminListPriceLists().catch(() => [] as PriceList[]),
      adminListCatalogs().catch(() => [] as AdminCatalogList[]),
      adminListPaymentConditions().catch(() => [] as AdminPaymentCondition[]),
    ])
    setAssignedCatalogs(cats)
    setLinkedUsers(users)
    setPriceLists(lists.filter((l) => l.scope === 'assigned'))
    setCatalogs(allCats)
    setPaymentConditions(conds.filter((c) => c.status === 'published' || c.status === 'draft'))
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!customerId) {
        setDraft(emptyDraft())
        setCnpjPreview(null)
        setSavedId(null)
        setLoading(false)
        const [lists, conds] = await Promise.all([
          adminListPriceLists().catch(() => [] as PriceList[]),
          adminListPaymentConditions().catch(() => [] as AdminPaymentCondition[]),
        ])
        if (!cancelled) {
          setPriceLists(lists.filter((l) => l.scope === 'assigned'))
          setPaymentConditions(conds.filter((c) => c.status === 'published' || c.status === 'draft'))
          setCatalogs(await adminListCatalogs().catch(() => []))
        }
        return
      }
      setLoading(true)
      setError(null)
      try {
        const c = await adminGetB2bCustomer(customerId)
        if (cancelled) return
        setDraft(fromCustomer(c))
        setSavedId(c.id)
        setCnpjPreview(null)
        await loadAccess(c.id)
      } catch (e) {
        if (!cancelled) setError(errMsg(e, 'Falha ao carregar cliente'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [customerId, loadAccess])

  async function buscarCnpj() {
    const digits = onlyDigits(draft.cnpj)
    if (!isValidCnpj(digits)) {
      setError('CNPJ inválido — corrija antes de consultar')
      return
    }
    setLookingCnpj(true)
    setError(null)
    setCnpjPreview(null)
    try {
      const hit = await lookupBrasilApiCnpj(digits)
      setCnpjPreview(hit)
      if (hit.statusWarning) {
        setError(
          `Situação cadastral: ${hit.cnpjStatus ?? 'irregular'} — pode salvar como rascunho após conferir.`,
        )
      }
    } catch (e) {
      setError(errMsg(e, 'Falha na consulta CNPJ — preencha manualmente'))
    } finally {
      setLookingCnpj(false)
    }
  }

  function aplicarReceita() {
    if (!cnpjPreview) return
    const a = cnpjPreview.address
    patch({
      legalName: cnpjPreview.legalName || draft.legalName,
      tradeName: cnpjPreview.tradeName || draft.tradeName,
      cnpj: formatCnpj(cnpjPreview.cnpj),
      cnpjStatus: cnpjPreview.cnpjStatus ?? '',
      cnpjCheckedAt: cnpjPreview.checkedAt,
      cnaeCode: cnpjPreview.cnaeCode ?? '',
      email: draft.email || cnpjPreview.email || '',
      phone: draft.phone || cnpjPreview.phone || '',
      postalCode: a.postalCode || draft.postalCode,
      street: a.street || draft.street,
      number: a.number || draft.number,
      complement: a.complement || draft.complement,
      district: a.district || draft.district,
      city: a.city || draft.city,
      state: a.state || draft.state,
      ibgeCode: a.ibgeCode || draft.ibgeCode,
      macroRegion: a.macroRegion || draft.macroRegion || '',
    })
    setCnpjPreview(null)
    setMenuPersist('identidade')
  }

  async function buscarCep() {
    const cep = onlyCepDigits(draft.postalCode)
    if (cep.length !== 8) {
      setError('CEP precisa ter 8 dígitos')
      return
    }
    setLookingCep(true)
    setError(null)
    try {
      const hit = await lookupViaCep(cep)
      if (!hit) {
        setError('CEP não encontrado — preencha o endereço manualmente')
        return
      }
      patch({
        postalCode: hit.postalCode,
        street: hit.street || draft.street,
        district: hit.district || draft.district,
        city: hit.city || draft.city,
        state: hit.state || draft.state,
        ibgeCode: hit.ibgeCode || draft.ibgeCode,
        macroRegion: hit.macroRegion || '',
        complement: hit.complement || draft.complement,
      })
    } catch (e) {
      setError(errMsg(e, 'Falha ViaCEP — preencha manualmente'))
    } finally {
      setLookingCep(false)
    }
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const digits = onlyDigits(draft.cnpj)
      if (!isValidCnpj(digits)) throw new Error('CNPJ inválido')
      if (!draft.legalName.trim()) throw new Error('Razão social obrigatória')

      const state = draft.state.trim().toUpperCase()
      const saved = await adminUpsertB2bCustomer({
        id: savedId ?? customerId ?? undefined,
        legalName: draft.legalName,
        tradeName: draft.tradeName,
        cnpj: digits,
        email: draft.email,
        phone: draft.phone,
        whatsapp: draft.whatsapp,
        contactName: draft.contactName,
        stateRegistration: draft.stateRegistration,
        ieIndicator: draft.ieIndicator || null,
        cnpjStatus: draft.cnpjStatus || null,
        cnpjCheckedAt: draft.cnpjCheckedAt || null,
        cnaeCode: draft.cnaeCode || null,
        status: draft.status,
        groupId: draft.groupId || null,
        notes: draft.notes,
        assignedPriceListId: draft.assignedPriceListId || null,
        paymentConditionIds: draft.paymentConditionIds,
        address: {
          kind: 'principal',
          postalCode: draft.postalCode || null,
          street: draft.street || null,
          number: draft.number || null,
          complement: draft.complement || null,
          district: draft.district || null,
          city: draft.city || null,
          state: state || null,
          ibgeCode: draft.ibgeCode || null,
          macroRegion: draft.macroRegion || macroRegionFromUf(state),
          country: 'BR',
        },
      })
      setSavedId(saved.id)
      setDraft(fromCustomer(saved))
      onSaved(saved)
      if (isCreate || !customerId) await loadAccess(saved.id)
    } catch (e) {
      setError(errMsg(e, 'Falha ao salvar'))
    } finally {
      setSaving(false)
    }
  }

  async function searchUsers() {
    const q = userQuery.trim()
    if (q.length < 2) {
      setError('Digite ao menos 2 caracteres')
      return
    }
    setUserSearching(true)
    try {
      setUserHits(await adminSearchUsers(q))
      setError(null)
    } catch (e) {
      setError(errMsg(e, 'Falha na busca de usuários'))
    } finally {
      setUserSearching(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <Loading />
      </div>
    )
  }

  const activeId = savedId ?? customerId

  return (
    <div className="flex h-full min-h-0 flex-col" data-customer-work-surface>
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-hf-line px-3 py-2">
        <div className="min-w-0">
          <p className="m-0 text-sm font-extrabold text-hf-ink">
            {draft.tradeName || draft.legalName || 'Novo cliente'}
          </p>
          <p className="mb-0 mt-0.5 text-[11px] text-hf-muted">
            {draft.cnpj || 'CNPJ'} · {draft.status}
            {draft.macroRegion ? ` · ${draft.macroRegion}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
          <Button type="button" size="sm" variant="light" onClick={onClose}>
            Fechar guia
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-hf-line px-2 py-1.5">
        {GUIDE_MENUS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={[
              'rounded-[8px] px-2.5 py-1 text-xs font-bold transition',
              menu === m.id ? 'bg-hf-red text-white' : 'text-hf-ink hover:bg-hf-bg',
            ].join(' ')}
            onClick={() => setMenuPersist(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {error ? <p className="mb-2 text-sm text-hf-danger">{error}</p> : null}

        {menu === 'identidade' ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Input
                  label="CNPJ"
                  value={draft.cnpj}
                  onChange={(e) => patch({ cnpj: formatCnpj(e.target.value) })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="light"
                disabled={lookingCnpj}
                onClick={() => void buscarCnpj()}
              >
                {lookingCnpj ? 'Buscando…' : 'Buscar CNPJ'}
              </Button>
            </div>
            {cnpjPreview ? (
              <div className="rounded-[10px] border border-hf-line bg-hf-bg p-3 text-sm">
                <p className="m-0 font-semibold text-hf-ink">{cnpjPreview.legalName}</p>
                <p className="mb-2 mt-1 text-xs text-hf-muted">
                  Situação: {cnpjPreview.cnpjStatus ?? '—'}
                  {cnpjPreview.statusWarning ? ' (atenção)' : ''}
                </p>
                <Button type="button" size="sm" onClick={aplicarReceita}>
                  Aplicar dados da Receita
                </Button>
              </div>
            ) : null}
            <Input
              label="Razão social"
              value={draft.legalName}
              onChange={(e) => patch({ legalName: e.target.value })}
              required
            />
            <Input
              label="Nome fantasia"
              value={draft.tradeName}
              onChange={(e) => patch({ tradeName: e.target.value })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Inscrição estadual (opcional)"
                value={draft.stateRegistration}
                onChange={(e) => patch({ stateRegistration: e.target.value })}
              />
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-extrabold text-hf-muted">
                  Indicador IE
                </span>
                <select
                  className="w-full rounded-[9px] border border-hf-line bg-hf-surface px-3 py-3 text-hf-ink"
                  value={draft.ieIndicator}
                  onChange={(e) =>
                    patch({ ieIndicator: e.target.value as IeIndicator | '' })
                  }
                >
                  <option value="">—</option>
                  <option value="icms">Contribuinte ICMS</option>
                  <option value="exempt">Isento</option>
                  <option value="non_contributor">Não contribuinte</option>
                </select>
              </label>
            </div>
            {(draft.cnpjStatus || draft.cnaeCode) && (
              <p className="m-0 text-xs text-hf-muted">
                Snapshot: {draft.cnpjStatus || '—'}
                {draft.cnaeCode ? ` · CNAE ${draft.cnaeCode}` : ''}
                {draft.cnpjCheckedAt
                  ? ` · consultado ${new Date(draft.cnpjCheckedAt).toLocaleString('pt-BR')}`
                  : ''}
              </p>
            )}
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-extrabold text-hf-muted">Observações</span>
              <textarea
                className="min-h-[72px] w-full rounded-[9px] border border-hf-line bg-hf-surface px-3 py-2 text-sm text-hf-ink"
                value={draft.notes}
                onChange={(e) => patch({ notes: e.target.value })}
              />
            </label>
          </div>
        ) : null}

        {menu === 'contato' ? (
          <div className="space-y-3">
            <Input
              label="Pessoa de contato"
              value={draft.contactName}
              onChange={(e) => patch({ contactName: e.target.value })}
              placeholder="Comprador / responsável na garagem"
            />
            <Input
              label="E-mail"
              value={draft.email}
              onChange={(e) => patch({ email: e.target.value })}
            />
            <Input
              label="Telefone"
              value={draft.phone}
              onChange={(e) => patch({ phone: e.target.value })}
            />
            <Input
              label="WhatsApp"
              value={draft.whatsapp}
              onChange={(e) => patch({ whatsapp: e.target.value })}
            />
          </div>
        ) : null}

        {menu === 'endereco' ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <Input
                  label="CEP"
                  value={draft.postalCode}
                  onChange={(e) => patch({ postalCode: formatCep(e.target.value) })}
                  placeholder="00000-000"
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="light"
                disabled={lookingCep}
                onClick={() => void buscarCep()}
              >
                {lookingCep ? 'Buscando…' : 'Buscar CEP'}
              </Button>
            </div>
            <Input
              label="Logradouro"
              value={draft.street}
              onChange={(e) => patch({ street: e.target.value })}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label="Número"
                value={draft.number}
                onChange={(e) => patch({ number: e.target.value })}
                placeholder="S/N"
              />
              <Input
                label="Complemento"
                value={draft.complement}
                onChange={(e) => patch({ complement: e.target.value })}
              />
              <Input
                label="Bairro"
                value={draft.district}
                onChange={(e) => patch({ district: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label="Cidade"
                value={draft.city}
                onChange={(e) => patch({ city: e.target.value })}
              />
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-extrabold text-hf-muted">UF</span>
                <select
                  className="w-full rounded-[9px] border border-hf-line bg-hf-surface px-3 py-3 text-hf-ink"
                  value={draft.state}
                  onChange={(e) => {
                    const uf = e.target.value
                    patch({
                      state: uf,
                      macroRegion: macroRegionFromUf(uf) ?? '',
                    })
                  }}
                >
                  <option value="">—</option>
                  {BR_UF_OPTIONS.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <p className="mb-1 text-xs font-extrabold text-hf-muted">Macrorregião</p>
                {draft.macroRegion ? (
                  <span className="inline-block rounded-full bg-hf-bg px-2.5 py-1 text-xs font-bold text-hf-ink">
                    {draft.macroRegion}
                  </span>
                ) : (
                  <span className="text-xs text-hf-muted">Derivada da UF</span>
                )}
              </div>
            </div>
            <Input
              label="Código IBGE (município)"
              value={draft.ibgeCode}
              onChange={(e) => patch({ ibgeCode: e.target.value })}
            />
          </div>
        ) : null}

        {menu === 'comercial' ? (
          <div className="space-y-3">
            <div className="rounded-[10px] border border-hf-line bg-hf-bg p-3">
              <h3 className="m-0 text-xs font-bold uppercase text-hf-muted">Cadastro comercial</h3>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <Select
                  label="Status"
                  value={draft.status}
                  onChange={(e) => patch({ status: e.target.value as CustomerStatus })}
                  options={STATUSES.map((s) => ({ value: s, label: s }))}
                />
                <Select
                  label="Grupo"
                  value={draft.groupId}
                  onChange={(e) => patch({ groupId: e.target.value })}
                  options={[
                    { value: '', label: '—' },
                    ...groups.map((g) => ({ value: g.id, label: g.name })),
                  ]}
                />
              </div>
            </div>

            <div className="rounded-[10px] border border-hf-line bg-hf-bg p-3">
              <h3 className="m-0 text-xs font-bold uppercase text-hf-muted">
                Lista B2B (assigned)
              </h3>
              <p className="mb-2 mt-1 text-xs text-hf-muted">
                Cliente autenticado vê os preços desta lista no catálogo e no site. Crie a lista em{' '}
                <Link to="/admin/precos" className="font-semibold underline">
                  Listas de preço
                </Link>{' '}
                com escopo <strong>assigned</strong>.
              </p>
              <Select
                label="Lista atribuída"
                value={draft.assignedPriceListId}
                disabled={priceLists.length === 0}
                onChange={(e) => patch({ assignedPriceListId: e.target.value })}
                options={[
                  {
                    value: '',
                    label: priceLists.length
                      ? 'Nenhuma (public / default)'
                      : 'Nenhuma lista assigned',
                  },
                  ...priceLists.map((l) => ({
                    value: l.id,
                    label: `${l.name}${l.status !== 'active' ? ` (${l.status})` : ''}`,
                  })),
                ]}
              />
            </div>

            <div className="rounded-[10px] border border-hf-line bg-hf-bg p-3">
              <h3 className="m-0 text-xs font-bold uppercase text-hf-muted">
                Condições de pagamento
              </h3>
              <p className="mt-1 text-xs text-hf-muted">
                Marque uma ou mais. Se nenhuma for selecionada, o cliente só terá{' '}
                <strong>À vista</strong>.
              </p>
              {paymentConditions.length ? (
                <ul className="mt-2 max-h-56 list-none space-y-2 overflow-y-auto p-0">
                  {paymentConditions.map((c) => {
                    const checked = draft.paymentConditionIds.includes(c.id)
                    const schedule = describePaymentSchedule({
                      scheduleMode: c.scheduleMode,
                      installmentCount: c.installmentCount,
                      equalIntervalDays: c.equalIntervalDays,
                      firstDueDays: c.firstDueDays,
                      weekday: c.weekday,
                      weekdayIntervalWeeks: c.weekdayIntervalWeeks,
                      businessDayRule: c.businessDayRule,
                      amountSplit: c.amountSplit,
                      installments: c.installments.map((i) => ({
                        seq: i.seq,
                        offsetDays: i.offsetDays,
                        percent: i.percent,
                        label: i.label,
                      })),
                    })
                    return (
                      <li key={c.id}>
                        <label
                          className={[
                            'flex cursor-pointer items-start gap-2 rounded-[10px] border border-hf-line bg-hf-surface p-3 text-sm transition hover:bg-hf-bg/50',
                            checked ? 'border-hf-red/40 ring-1 ring-hf-red/20' : '',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={checked}
                            onChange={() => togglePaymentCondition(c.id)}
                          />
                          <span className="min-w-0">
                            <span className="block font-semibold text-hf-ink">
                              {c.name}{' '}
                              <span className="font-mono text-[11px] font-normal text-hf-muted">
                                ({c.code})
                              </span>
                              {c.status !== 'published' ? (
                                <span className="ml-1 text-[11px] font-bold text-hf-muted">
                                  · {c.status}
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-0.5 block text-xs text-hf-muted">{schedule}</span>
                          </span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-hf-muted">
                  Nenhuma condição cadastrada. Crie em{' '}
                  <Link
                    className="font-semibold underline"
                    to="/admin/financeiro/condicoes"
                  >
                    Condições de pagamento
                  </Link>
                  .
                </p>
              )}
              {!draft.paymentConditionIds.length ? (
                <p className="mb-0 mt-2 text-xs font-semibold text-hf-ink">
                  Seleção atual: apenas À vista (padrão).
                </p>
              ) : (
                <p className="mb-0 mt-2 text-xs text-hf-muted">
                  {draft.paymentConditionIds.length} condição(ões) vinculada(s).
                </p>
              )}
            </div>
          </div>
        ) : null}

        {menu === 'acesso' ? (
          <div className="space-y-4">
            {!activeId ? (
              <p className="text-sm text-hf-muted">Salve o cliente antes de vincular catálogos e usuários.</p>
            ) : (
              <>
                <div className="rounded-[10px] border border-hf-line bg-hf-bg p-3">
                  <h3 className="m-0 text-xs font-bold uppercase text-hf-muted">Catálogos</h3>
                  <p className="mt-1 text-xs text-hf-muted">
                    Atuais: {assignedCatalogs.length || 'nenhum'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <select
                      className="rounded-[9px] border border-hf-line px-3 py-2 text-sm"
                      value={catalogId}
                      onChange={(e) => setCatalogId(e.target.value)}
                    >
                      <option value="">Selecionar…</option>
                      {catalogs.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      variant="light"
                      disabled={!catalogId}
                      onClick={() => {
                        void (async () => {
                          if (!activeId || !catalogId) return
                          await adminAssignCatalogToCustomer(activeId, catalogId)
                          setAssignedCatalogs(await adminListCustomerCatalogIds(activeId))
                          setCatalogId('')
                        })()
                      }}
                    >
                      Associar
                    </Button>
                  </div>
                </div>

                <div className="rounded-[10px] border border-hf-line bg-hf-bg p-3">
                  <h3 className="m-0 text-xs font-bold uppercase text-hf-muted">Usuários (login)</h3>
                  {linkedUsers.length ? (
                    <ul className="mt-2 space-y-2">
                      {linkedUsers.map((u) => (
                        <li
                          key={u.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-hf-line bg-hf-surface px-3 py-2 text-sm"
                        >
                          <div>
                            <div className="font-semibold">
                              {u.fullName || u.username || u.profileId.slice(0, 8)}
                              {u.isPrimary ? (
                                <span className="ml-2 text-xs font-bold text-hf-success">
                                  principal
                                </span>
                              ) : null}
                            </div>
                            <div className="text-xs text-hf-muted">
                              {u.email ?? '—'} · {u.status}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {!u.isPrimary ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="light"
                                onClick={() => {
                                  void (async () => {
                                    if (!activeId) return
                                    await adminSetCustomerUserPrimary(activeId, u.id)
                                    setLinkedUsers(await adminListCustomerUsers(activeId))
                                  })()
                                }}
                              >
                                Principal
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              size="sm"
                              variant="light"
                              onClick={() => {
                                void (async () => {
                                  if (!activeId) return
                                  await adminUnlinkUserFromCustomer(u.id)
                                  setLinkedUsers(await adminListCustomerUsers(activeId))
                                })()
                              }}
                            >
                              Desvincular
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs text-hf-muted">Nenhum usuário vinculado.</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Input
                      label="Buscar usuário"
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      placeholder="e-mail, nome…"
                    />
                    <div className="flex items-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="light"
                        disabled={userSearching}
                        onClick={() => void searchUsers()}
                      >
                        {userSearching ? '…' : 'Buscar'}
                      </Button>
                    </div>
                  </div>
                  {userHits.length ? (
                    <ul className="mt-2 space-y-1">
                      {userHits.map((hit) => {
                        const already = linkedUsers.some((u) => u.profileId === hit.id)
                        return (
                          <li
                            key={hit.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-[8px] border border-hf-line bg-hf-surface px-3 py-2 text-sm"
                          >
                            <span>
                              {hit.email ?? hit.username ?? hit.id.slice(0, 8)}
                              {hit.fullName ? ` · ${hit.fullName}` : ''}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              disabled={already}
                              onClick={() => {
                                void (async () => {
                                  if (!activeId) return
                                  await adminLinkUserToCustomer({
                                    customerId: activeId,
                                    profileId: hit.id,
                                    isPrimary: linkedUsers.length === 0,
                                  })
                                  setLinkedUsers(await adminListCustomerUsers(activeId))
                                  setUserHits((prev) => prev.filter((h) => h.id !== hit.id))
                                })()
                              }}
                            >
                              {already ? 'Já vinculado' : 'Vincular'}
                            </Button>
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}
                </div>
              </>
            )}
          </div>
        ) : null}

        {menu === 'credito' ? (
          <div className="rounded-[10px] border border-dashed border-hf-line bg-hf-bg p-3">
            <h3 className="m-0 text-xs font-bold uppercase text-hf-muted">Crédito — em breve</h3>
            <p className="mb-0 mt-1 text-xs text-hf-muted">
              Limite, liberação e análise ficam para o próximo epic. Cadastro estruturado primeiro.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
