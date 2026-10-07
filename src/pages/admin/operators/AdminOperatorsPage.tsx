import { Loading } from '@/components/common/Loading'
import { PageShell } from '@/components/layout/PageShell'
import { useAuth } from '@/contexts/AuthContext'
import { formatDateTime } from '@/lib/datetime'
import {
  ASSIGNABLE_ROLES,
  adminDeactivateOperator,
  adminSearchUsers,
  adminSetUserRole,
  type AdminOperatorUserRow,
  type AssignableRole,
} from '@/services/admin/adminOperatorsService'
import { useEffect, useState, type FormEvent } from 'react'

export function AdminOperatorsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'administrador'

  const [query, setQuery] = useState('')
  const [rows, setRows] = useState<AdminOperatorUserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  async function load(q: string) {
    if (!isAdmin) return
    setError(null)
    setLoading(true)
    try {
      setRows(await adminSearchUsers(q))
    } catch (err) {
      setRows([])
      setError(err instanceof Error ? err.message : 'Erro ao carregar operadores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load('')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montagem: lista staff
  }, [isAdmin])

  async function search(e?: FormEvent) {
    e?.preventDefault()
    setOkMsg(null)
    await load(query)
  }

  async function onRoleChange(row: AdminOperatorUserRow, next: AssignableRole) {
    if (!isAdmin || next === row.role) return
    setError(null)
    setOkMsg(null)
    setSavingId(row.id)
    try {
      const updated = await adminSetUserRole(row.id, next)
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? {
                ...r,
                role: updated.role,
                fullName: updated.fullName ?? r.fullName,
                deactivatedAt: next === 'customer' ? r.deactivatedAt : null,
              }
            : r,
        ),
      )
      setOkMsg(`Acesso atualizado: ${row.email ?? row.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao alterar acesso')
    } finally {
      setSavingId(null)
    }
  }

  async function onDeactivate(row: AdminOperatorUserRow) {
    if (!isAdmin || row.id === user?.id) return
    const ok = window.confirm(
      `Desativar acesso de ${row.email ?? row.fullName ?? 'este usuário'}?\n\n` +
        `A conta vira Cliente e deixa de entrar no painel. Pedidos e histórico permanecem.`,
    )
    if (!ok) return
    setError(null)
    setOkMsg(null)
    setSavingId(row.id)
    try {
      const updated = await adminDeactivateOperator(row.id)
      setRows((prev) => prev.filter((r) => r.id !== row.id || Boolean(query.trim())))
      if (query.trim()) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? { ...r, role: updated.role, deactivatedAt: updated.deactivatedAt }
              : r,
          ),
        )
      }
      setOkMsg(`Acesso desativado: ${row.email ?? row.id}`)
      if (!query.trim()) await load('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desativar')
    } finally {
      setSavingId(null)
    }
  }

  if (!isAdmin) {
    return (
      <p className="text-sm text-red-600">
        Sem permissão. Somente administrador gerencia acesso ao painel.
      </p>
    )
  }

  return (
    <PageShell
      title="Operadores"
      description="Quem acessa o painel. Preferir desativar em vez de excluir. Login é individual (e-mail + senha de cada pessoa)."
    >
      <div className="space-y-4">
        <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1 text-sm">
            <span className="mb-1 block font-semibold text-fal-navy">
              Buscar e-mail ou nome (vazio = equipe)
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ex: lucas@… ou deixe vazio"
              className="w-full rounded-[10px] border border-fal-line bg-white px-3 py-2 text-fal-navy outline-none focus:border-fal-yellow"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="rounded-[10px] bg-fal-navy px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? 'Carregando…' : 'Atualizar'}
          </button>
        </form>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {okMsg ? <p className="text-sm text-emerald-700">{okMsg}</p> : null}

        {loading ? <Loading label="Carregando…" /> : null}

        {!loading && rows.length === 0 ? (
          <p className="text-sm text-fal-muted">
            Nenhum operador listado. Busque pelo e-mail de quem já se cadastrou na loja.
          </p>
        ) : null}

        {!loading && rows.length > 0 ? (
          <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-fal-line bg-fal-bg text-xs uppercase text-fal-muted">
                <tr>
                  <th className="px-3 py-2">E-mail</th>
                  <th className="px-3 py-2">Nome</th>
                  <th className="px-3 py-2">Desde</th>
                  <th className="px-3 py-2">Último acesso</th>
                  <th className="px-3 py-2">Nível</th>
                  <th className="px-3 py-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-fal-line last:border-0">
                    <td className="px-3 py-2 font-medium text-fal-navy">{r.email ?? '—'}</td>
                    <td className="px-3 py-2 text-fal-muted">{r.fullName ?? r.username ?? '—'}</td>
                    <td className="px-3 py-2 text-fal-muted">{formatDateTime(r.createdAt)}</td>
                    <td className="px-3 py-2 text-fal-muted">
                      {r.lastSignInAt ? formatDateTime(r.lastSignInAt) : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={r.role}
                        disabled={savingId === r.id || Boolean(r.deactivatedAt)}
                        onChange={(e) => void onRoleChange(r, e.target.value as AssignableRole)}
                        className="w-full max-w-[220px] rounded-[8px] border border-fal-line bg-white px-2 py-1.5 text-sm font-semibold text-fal-navy disabled:opacity-50"
                      >
                        {ASSIGNABLE_ROLES.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {r.deactivatedAt ? (
                        <span className="mt-1 block text-xs text-fal-danger">Desativado</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      {r.role !== 'customer' && r.id !== user?.id ? (
                        <button
                          type="button"
                          disabled={savingId === r.id}
                          onClick={() => void onDeactivate(r)}
                          className="text-xs font-semibold text-fal-danger hover:underline disabled:opacity-50"
                        >
                          Desativar
                        </button>
                      ) : (
                        <span className="text-xs text-fal-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </PageShell>
  )
}
