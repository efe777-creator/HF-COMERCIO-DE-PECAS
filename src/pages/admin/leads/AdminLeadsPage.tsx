import { Button } from '@/components/common/Button'
import { Loading } from '@/components/common/Loading'
import {
  adminListLeads,
  adminUpdateLeadStatus,
  type LeadKind,
  type LeadRow,
  type LeadStatus,
} from '@/services/leads/leadService'
import { useEffect, useState } from 'react'

const STATUS_OPTIONS: LeadStatus[] = ['new', 'in_progress', 'won', 'lost', 'spam']

function statusLabel(s: LeadStatus): string {
  const map: Record<LeadStatus, string> = {
    new: 'Novo',
    in_progress: 'Em atendimento',
    won: 'Ganho',
    lost: 'Perdido',
    spam: 'Spam',
  }
  return map[s] ?? s
}

function kindLabel(k: LeadKind): string {
  if (k === 'quote') return 'Cotação'
  if (k === 'partner') return 'Parceiro'
  return 'Contato'
}

type Props = {
  defaultKind?: LeadKind | 'all'
  title?: string
}

export function AdminLeadsPage({ defaultKind = 'all', title = 'Leads (inbox)' }: Props) {
  const [kind, setKind] = useState<LeadKind | 'all'>(defaultKind)
  const [rows, setRows] = useState<LeadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminListLeads(kind))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [kind])

  return (
    <div className="space-y-4">
      <h1 className="m-0 text-2xl font-extrabold text-hf-ink">{title}</h1>
      {defaultKind === 'all' ? (
        <p className="m-0 text-sm text-hf-muted">
          Inbox geral de contatos. Cotação é um tipo de lead — use o filtro ou a tela Cotações.
        </p>
      ) : null}
      {error ? <p className="text-sm text-hf-danger">{error}</p> : null}

      <label className="inline-block text-sm">
        <span className="mb-1 block font-semibold">Tipo</span>
        <select
          className="rounded-[10px] border border-hf-line px-3 py-2"
          value={kind}
          onChange={(e) => setKind(e.target.value as LeadKind | 'all')}
        >
          <option value="all">Todos</option>
          <option value="quote">Cotações</option>
          <option value="partner">Seja parceiro</option>
          <option value="contact">Contato</option>
        </select>
      </label>

      {loading ? <Loading label="Carregando leads…" /> : null}

      <div className="overflow-x-auto rounded-[14px] border border-hf-line bg-hf-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-hf-bg text-hf-muted">
            <tr>
              <th className="px-3 py-2 font-semibold">Data</th>
              <th className="px-3 py-2 font-semibold">Tipo</th>
              <th className="px-3 py-2 font-semibold">Contato</th>
              <th className="px-3 py-2 font-semibold">Empresa</th>
              <th className="px-3 py-2 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-hf-line">
                <td className="px-3 py-2 text-hf-muted">
                  {new Date(row.created_at).toLocaleString('pt-BR')}
                </td>
                <td className="px-3 py-2">{kindLabel(row.kind)}</td>
                <td className="px-3 py-2">
                  <div className="font-semibold text-hf-ink">{row.contact_name}</div>
                  <div className="text-xs text-hf-muted">
                    {[row.contact_email, row.contact_phone].filter(Boolean).join(' · ')}
                  </div>
                </td>
                <td className="px-3 py-2">{row.company_name ?? '—'}</td>
                <td className="px-3 py-2">
                  <select
                    className="rounded-[8px] border border-hf-line px-2 py-1 text-sm"
                    value={row.status}
                    onChange={(e) =>
                      void adminUpdateLeadStatus(row.id, e.target.value as LeadStatus)
                        .then(reload)
                        .catch((err) => setError(String(err.message ?? err)))
                    }
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {statusLabel(s)}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && rows.length === 0 ? (
        <p className="text-sm text-hf-muted">Nenhum lead neste filtro.</p>
      ) : null}

      <Button type="button" variant="light" onClick={() => void reload()}>
        Atualizar
      </Button>
    </div>
  )
}