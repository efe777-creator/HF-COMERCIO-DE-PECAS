import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { entityStatusLabel } from '@/lib/adminLabels'
import {
  adminListManufacturers,
  adminSetManufacturerStatus,
  adminUpsertManufacturer,
} from '@/services/admin/adminManufacturerService'
import type { Manufacturer } from '@/types'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

export function AdminManufacturersPage() {
  const [items, setItems] = useState<Manufacturer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<Manufacturer | null>(null)
  const [search, setSearch] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  async function reload() {
    setLoading(true)
    try {
      setItems(await adminListManufacturers())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar montadoras')
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
    return items.filter((m) => m.name.toLowerCase().includes(q) || m.slug.toLowerCase().includes(q))
  }, [items, search])

  function startEdit(m: Manufacturer) {
    setEditing(m)
    setName(m.name)
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    })
  }

  function cancelEdit() {
    setEditing(null)
    setName('')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await adminUpsertManufacturer({ id: editing?.id, name, status: editing?.status ?? 'active' })
      setName('')
      setEditing(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-fal-navy">Montadoras</h1>
      <p className="text-sm text-fal-muted">
        Cadastro de montadora (veículo). Não confundir com fabricante de peça.
      </p>
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className={`flex flex-wrap items-end gap-3 rounded-[14px] border bg-white p-4 ${
          editing ? 'border-fal-yellow-dark ring-2 ring-fal-yellow/40' : 'border-fal-line'
        }`}
      >
        <div className="min-w-[220px] flex-1">
          <Input
            ref={nameInputRef}
            label={editing ? 'Editar montadora' : 'Nova montadora'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <Button type="submit" variant="primary">
          {editing ? 'Salvar' : 'Criar'}
        </Button>
        {editing ? (
          <Button type="button" variant="light" onClick={cancelEdit}>
            Cancelar
          </Button>
        ) : null}
      </form>
      <Input
        label="Buscar montadora"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Nome ou slug…"
      />
      {error ? <p className="text-sm text-fal-danger">{error}</p> : null}
      {loading ? <Loading /> : null}
      <div className="overflow-x-auto rounded-[14px] border border-fal-line bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-fal-bg text-fal-muted">
            <tr>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-fal-muted">
                  Nenhuma montadora encontrada.
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr
                  key={m.id}
                  className={`border-t border-fal-line ${
                    editing?.id === m.id ? 'bg-fal-yellow/20' : ''
                  }`}
                >
                  <td className="px-3 py-2 font-semibold">{m.name}</td>
                  <td className="px-3 py-2 text-fal-muted">{m.slug}</td>
                  <td className="px-3 py-2">{entityStatusLabel(m.status)}</td>
                  <td className="px-3 py-2 space-x-2">
                    <button
                      type="button"
                      className="font-semibold text-fal-auth-link"
                      onClick={() => startEdit(m)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="font-semibold text-fal-muted"
                      onClick={() =>
                        void adminSetManufacturerStatus(
                          m.id,
                          m.status === 'active' ? 'inactive' : 'active',
                        ).then(reload)
                      }
                    >
                      {m.status === 'active' ? 'Inativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
