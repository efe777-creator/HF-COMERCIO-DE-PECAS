import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import {
  adminListB2bCustomers,
  adminListCustomerGroups,
  adminSetCustomerStatus,
  adminUpsertB2bCustomer,
  type AdminB2bCustomer,
  type AdminCustomerGroup,
  type CustomerStatus,
} from '@/services/admin/adminB2bCustomerService'
import {
  adminAssignCatalogToCustomer,
  adminListCatalogs,
  adminListCustomerCatalogIds,
  type AdminCatalogList,
} from '@/services/admin/adminCatalogListService'
import { useEffect, useMemo, useState, type FormEvent } from 'react'

const STATUSES: CustomerStatus[] = ['pending', 'active', 'suspended', 'inactive']

export function AdminCustomersPage() {
  const [items, setItems] = useState<AdminB2bCustomer[]>([])
  const [groups, setGroups] = useState<AdminCustomerGroup[]>([])
  const [catalogs, setCatalogs] = useState<AdminCatalogList[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<AdminB2bCustomer | null>(null)
  const [legalName, setLegalName] = useState('')
  const [tradeName, setTradeName] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [status, setStatus] = useState<CustomerStatus>('pending')
  const [groupId, setGroupId] = useState('')
  const [catalogId, setCatalogId] = useState('')
  const [assignedCatalogs, setAssignedCatalogs] = useState<string[]>([])

  async function reload() {
    setLoading(true)
    try {
      const [customers, g, c] = await Promise.all([
        adminListB2bCustomers(),
        adminListCustomerGroups(),
        adminListCatalogs(),
      ])
      setItems(customers)
      setGroups(g)
      setCatalogs(c)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (c) =>
        c.legalName.toLowerCase().includes(q) ||
        (c.tradeName ?? '').toLowerCase().includes(q) ||
        (c.cnpj ?? '').includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
    )
  }, [items, search])

  async function startEdit(c: AdminB2bCustomer) {
    setEditing(c)
    setLegalName(c.legalName)
    setTradeName(c.tradeName ?? '')
    setCnpj(c.cnpj ?? '')
    setEmail(c.email ?? '')
    setPhone(c.phone ?? '')
    setWhatsapp(c.whatsapp ?? '')
    setStatus(c.status)
    setGroupId(c.groupId ?? '')
    setAssignedCatalogs(await adminListCustomerCatalogIds(c.id))
  }

  function resetForm() {
    setEditing(null)
    setLegalName('')
    setTradeName('')
    setCnpj('')
    setEmail('')
    setPhone('')
    setWhatsapp('')
    setStatus('pending')
    setGroupId('')
    setCatalogId('')
    setAssignedCatalogs([])
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await adminUpsertB2bCustomer({
        id: editing?.id,
        legalName,
        tradeName,
        cnpj,
        email,
        phone,
        whatsapp,
        status,
        groupId: groupId || null,
      })
      resetForm()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-fal-navy">Clientes B2B</h1>
      <p className="text-sm text-fal-muted">
        Cadastro de empresas. Status controla acesso. Associe grupo e catálogos.
      </p>

      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-[14px] border border-fal-line bg-white p-4 md:grid-cols-2"
      >
        <Input label="Razão social" value={legalName} onChange={(e) => setLegalName(e.target.value)} required />
        <Input label="Nome fantasia" value={tradeName} onChange={(e) => setTradeName(e.target.value)} />
        <Input label="CNPJ" value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
        <Input label="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Telefone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="WhatsApp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-fal-navy">Status</span>
          <select
            className="w-full rounded-[10px] border border-fal-line px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value as CustomerStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-semibold text-fal-navy">Grupo</span>
          <select
            className="w-full rounded-[10px] border border-fal-line px-3 py-2"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="">—</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button type="submit">{editing ? 'Salvar cliente' : 'Criar cliente'}</Button>
          {editing ? (
            <Button type="button" variant="light" onClick={resetForm}>
              Cancelar
            </Button>
          ) : null}
        </div>
        {editing ? (
          <div className="md:col-span-2 rounded-[10px] border border-fal-line bg-fal-bg p-3">
            <p className="m-0 text-sm font-semibold text-fal-navy">Catálogos do cliente</p>
            <p className="mt-1 text-xs text-fal-muted">
              Atuais: {assignedCatalogs.length ? assignedCatalogs.length : 'nenhum'}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <select
                className="rounded-[10px] border border-fal-line px-3 py-2 text-sm"
                value={catalogId}
                onChange={(e) => setCatalogId(e.target.value)}
              >
                <option value="">Selecionar catálogo…</option>
                {catalogs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
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
                    await adminAssignCatalogToCustomer(editing.id, catalogId)
                    setAssignedCatalogs(await adminListCustomerCatalogIds(editing.id))
                    setCatalogId('')
                  })()
                }}
              >
                Associar catálogo
              </Button>
            </div>
          </div>
        ) : null}
      </form>

      <Input label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Razão, CNPJ, e-mail…" />
      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
      {loading ? <Loading /> : null}

      <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-fal-bg text-fal-muted">
            <tr>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">CNPJ</th>
              <th className="px-3 py-2">Grupo</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-fal-line">
                <td className="px-3 py-2">
                  <div className="font-semibold text-fal-navy">{c.legalName}</div>
                  <div className="text-xs text-fal-muted">{c.email}</div>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{c.cnpj}</td>
                <td className="px-3 py-2">{c.groupName ?? '—'}</td>
                <td className="px-3 py-2">{c.status}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    <Button type="button" variant="light" size="sm" onClick={() => void startEdit(c)}>
                      Editar
                    </Button>
                    {c.status !== 'active' ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => void adminSetCustomerStatus(c.id, 'active').then(reload)}
                      >
                        Ativar
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="light"
                        size="sm"
                        onClick={() => void adminSetCustomerStatus(c.id, 'suspended').then(reload)}
                      >
                        Suspender
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
