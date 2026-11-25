import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import {
  adminDeleteCampaign,
  adminListCampaigns,
  adminUpsertCampaign,
  type Campaign,
  type CampaignStatus,
} from '@/services/admin/adminCampaignService'
import { isoToDatetimeLocal } from '@/lib/datetime'
import { useEffect, useState, type FormEvent } from 'react'

export function AdminCampaignsPage() {
  const [items, setItems] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Campaign | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [href, setHref] = useState('')
  const [status, setStatus] = useState<CampaignStatus>('draft')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [saving, setSaving] = useState(false)

  async function reload() {
    setLoading(true)
    setError(null)
    try {
      setItems(await adminListCampaigns())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  function resetForm() {
    setEditing(null)
    setTitle('')
    setDescription('')
    setHref('')
    setStatus('draft')
    setStartsAt('')
    setEndsAt('')
  }

  function loadForm(c: Campaign) {
    setEditing(c)
    setTitle(c.title)
    setDescription(c.description ?? '')
    setHref(c.href ?? '')
    setStatus(c.status)
    setStartsAt(c.startsAt ? isoToDatetimeLocal(c.startsAt) : '')
    setEndsAt(c.endsAt ? isoToDatetimeLocal(c.endsAt) : '')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await adminUpsertCampaign({
        id: editing?.id,
        title,
        description,
        href,
        status,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      })
      resetForm()
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading label="Carregando campanhas…" />

  return (
    <div className="space-y-6">
      <h1 className="m-0 text-2xl font-extrabold text-hf-ink">Campanhas</h1>
      <p className="text-sm text-hf-muted">
        Destaques na home. Descrição em subtítulo; link de ação em URL (campo href).
      </p>
      {error ? <p className="text-sm text-hf-danger">{error}</p> : null}

      <form onSubmit={onSubmit} className="space-y-3 rounded-[14px] border border-hf-line bg-hf-surface p-4">
        <h2 className="m-0 font-extrabold text-hf-ink">{editing ? 'Editar campanha' : 'Nova campanha'}</h2>
        <Input label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Input label="Descrição" value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input label="Link (href)" value={href} onChange={(e) => setHref(e.target.value)} placeholder="/catalogo" />
        <label className="block text-sm">
          <span className="mb-1 block font-semibold">Status</span>
          <select
            className="w-full rounded-[10px] border border-hf-line px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value as CampaignStatus)}
          >
            <option value="draft">Rascunho</option>
            <option value="active">Ativa</option>
            <option value="archived">Arquivada</option>
          </select>
        </label>
        <Input label="Início" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        <Input label="Fim" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
          {editing ? (
            <Button type="button" variant="light" onClick={resetForm}>
              Cancelar
            </Button>
          ) : null}
        </div>
      </form>

      <ul className="m-0 list-none space-y-2 p-0">
        {items.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-hf-line bg-hf-surface px-4 py-3"
          >
            <div>
              <p className="m-0 font-extrabold text-hf-ink">{c.title}</p>
              <p className="m-0 text-sm text-hf-muted">
                {c.status}
                {c.description ? ` · ${c.description}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="light" onClick={() => loadForm(c)}>
                Editar
              </Button>
              <Button
                type="button"
                variant="light"
                onClick={() =>
                  void adminDeleteCampaign(c.id)
                    .then(reload)
                    .catch((e) => setError(String(e.message ?? e)))
                }
              >
                Excluir
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}