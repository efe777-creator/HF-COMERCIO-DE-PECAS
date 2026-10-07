import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { productStatusLabel } from '@/lib/adminLabels'
import {
  adminListCategories,
  categoryPath,
  collectCategorySubtreeIds,
} from '@/services/admin/adminCategoryService'
import { adminListManufacturers } from '@/services/admin/adminManufacturerService'
import {
  adminListProducts,
  adminReleaseProductsToStore,
  adminSetProductStatus,
} from '@/services/admin/adminProductService'
import { CODIGO_REFERENCIA_LABEL } from '@/lib/productLabels'
import type { Category, Manufacturer, Product } from '@/types'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

export function AdminProductsPage() {
  const [items, setItems] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [manufacturerId, setManufacturerId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [withoutImage, setWithoutImage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busyBulk, setBusyBulk] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  const categoryOptions = useMemo(
    () =>
      [...categories].sort((a, b) =>
        categoryPath(categories, a.id).localeCompare(categoryPath(categories, b.id)),
      ),
    [categories],
  )

  const allPageSelected = items.length > 0 && items.every((p) => selected.has(p.id))
  const somePageSelected = items.some((p) => selected.has(p.id))

  async function reload() {
    setLoading(true)
    setSelected(new Set())
    try {
      const categoryIds = categoryId
        ? collectCategorySubtreeIds(categories, categoryId)
        : undefined
      setItems(
        await adminListProducts({
          q,
          status: status || undefined,
          withoutImage,
          categoryIds,
          manufacturerId: manufacturerId || undefined,
        }),
      )
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao listar produtos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const [cats, makers] = await Promise.all([
          adminListCategories(),
          adminListManufacturers(),
        ])
        setCategories(cats)
        setManufacturers(makers)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar filtros')
      }
    })()
  }, [])

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withoutImage])

  function toggleSelectAllPage() {
    if (allPageSelected) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(items.map((p) => p.id)))
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function toggleArchive(p: Product) {
    const next = p.status === 'archived' ? 'published' : 'archived'
    if (next === 'archived') {
      const ok = window.confirm(
        `Remover "${p.name}" do catálogo público?\n\nO produto será arquivado (permanece no banco; some da loja e da busca).`,
      )
      if (!ok) return
    }
    setMessage(null)
    setError(null)
    try {
      await adminSetProductStatus(p.id, next)
      setMessage(next === 'archived' ? 'Produto arquivado e removido da loja.' : 'Produto publicado novamente.')
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao alterar status')
    }
  }

  async function bulkSetStatus(next: 'published' | 'archived') {
    const ids = [...selected]
    if (ids.length === 0) return
    if (next === 'archived') {
      const ok = window.confirm(
        `Arquivar ${ids.length} produto(s)?\n\nRemoção comercial da loja (permanecem no banco).`,
      )
      if (!ok) return
    }
    setBusyBulk(true)
    setMessage(null)
    setError(null)
    try {
      await Promise.all(ids.map((id) => adminSetProductStatus(id, next)))
      setMessage(
        next === 'archived'
          ? `${ids.length} produto(s) arquivado(s).`
          : `${ids.length} produto(s) ativado(s) (publicado).`,
      )
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha na ação em massa')
    } finally {
      setBusyBulk(false)
    }
  }

  async function bulkLiberarNaLoja() {
    const ids = [...selected]
    if (ids.length === 0) return
    const ok = window.confirm(
      `Liberar ${ids.length} produto(s) na loja?\n\n` +
        '• Publica se ainda não estiver published\n' +
        '• Exige preço > 0 (lista padrão/ativa ou avulso)\n' +
        '• Marca disponível (is_available)\n\nConfirmar?',
    )
    if (!ok) return
    setBusyBulk(true)
    setMessage(null)
    setError(null)
    try {
      const { released, failed } = await adminReleaseProductsToStore({
        productIds: ids,
        publishIfNeeded: true,
      })
      const failHint =
        failed.length > 0
          ? ` · ${failed.length} falha(s): ${failed
              .slice(0, 3)
              .map((f) => (!f.ok ? f.reason : f.productId))
              .join('; ')}${failed.length > 3 ? '…' : ''}`
          : ''
      setMessage(`${released} liberado(s) no catálogo${failHint}`)
      if (failed.length > 0 && released === 0) {
        setError('Nenhum produto liberado. Verifique status (draft/published).')
      }
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao liberar na loja')
    } finally {
      setBusyBulk(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-hf-ink">Produtos</h1>
          <p className="mt-1 text-sm text-hf-muted">
            Arquivar = remoção comercial da loja. Exclusão permanente não é usada (integridade).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/produtos/importar">
            <Button variant="light">Importar produtos</Button>
          </Link>
          <Link to="/admin/produtos/importar-aplicacoes">
            <Button variant="light">Importar aplicações</Button>
          </Link>
          <Link to="/admin/produtos/importar-hf">
            <Button variant="light">Importar HF</Button>
          </Link>
          <Link to="/admin/produtos/novo">
            <Button variant="primary">Novo produto</Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-[14px] border border-hf-line bg-hf-surface p-4">
        <div className="min-w-[180px] flex-1">
          <Input label="Buscar (nome/SKU)" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label className="block min-w-[140px] text-sm">
          <span className="mb-1 block font-semibold text-hf-ink">Status</span>
          <select
            className="w-full rounded-[10px] border border-hf-line px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos</option>
            <option value="draft">Rascunho</option>
            <option value="published">Publicado</option>
            <option value="archived">Arquivado</option>
          </select>
        </label>
        <label className="block min-w-[160px] flex-1 text-sm">
          <span className="mb-1 block font-semibold text-hf-ink">Montadora</span>
          <select
            className="w-full rounded-[10px] border border-hf-line px-3 py-2"
            value={manufacturerId}
            onChange={(e) => setManufacturerId(e.target.value)}
          >
            <option value="">Todas</option>
            {manufacturers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-[200px] flex-[1.4] text-sm">
          <span className="mb-1 block font-semibold text-hf-ink">Classificação</span>
          <select
            className="w-full rounded-[10px] border border-hf-line px-3 py-2"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Todas</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {categoryPath(categories, c.id)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm font-semibold text-hf-ink">
          <input type="checkbox" checked={withoutImage} onChange={(e) => setWithoutImage(e.target.checked)} />
          Sem imagem / incompletos
        </label>
        <Button type="button" variant="light" onClick={() => void reload()}>
          Filtrar
        </Button>
      </div>

      {selected.size > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-hf-red/40 bg-hf-red/15 px-4 py-3">
          <span className="text-sm font-semibold text-hf-ink">{selected.size} selecionado(s)</span>
          <Button
            type="button"
            variant="primary"
            disabled={busyBulk}
            onClick={() => void bulkLiberarNaLoja()}
          >
            Liberar na loja
          </Button>
          <Button
            type="button"
            variant="light"
            disabled={busyBulk}
            onClick={() => void bulkSetStatus('published')}
          >
            Publicar
          </Button>
          <Button
            type="button"
            variant="light"
            disabled={busyBulk}
            onClick={() => void bulkSetStatus('archived')}
          >
            Arquivar
          </Button>
          <button
            type="button"
            className="text-sm font-semibold text-hf-muted underline"
            onClick={() => setSelected(new Set())}
          >
            Limpar seleção
          </button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-hf-danger">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-hf-ink">{message}</p> : null}
      {loading ? <Loading /> : null}

      <div className="overflow-x-auto rounded-[14px] border border-hf-line bg-hf-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-hf-bg text-hf-muted">
            <tr>
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = somePageSelected && !allPageSelected
                  }}
                  onChange={toggleSelectAllPage}
                  aria-label="Selecionar página"
                  disabled={items.length === 0 || loading}
                />
              </th>
              <th className="px-3 py-2">{CODIGO_REFERENCIA_LABEL}</th>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Preço</th>
              <th className="px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-hf-muted">
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : null}
            {items.map((p) => (
              <tr key={p.id} className="border-t border-hf-line">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => toggleRow(p.id)}
                    aria-label={`Selecionar ${p.sku}`}
                  />
                </td>
                <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                <td className="px-3 py-2 font-semibold">
                  {p.name}
                  {p.isIncomplete ? (
                    <span className="ml-2 text-xs font-bold text-hf-red-bright-dark">INCOMPLETO</span>
                  ) : null}
                </td>
                <td className="px-3 py-2">{productStatusLabel(p.status)}</td>
                <td className="px-3 py-2">
                  {p.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-3 py-2 space-x-2">
                  <Link className="font-semibold text-hf-auth-link" to={`/admin/produtos/${p.id}`}>
                    Editar
                  </Link>
                  <button type="button" className="font-semibold text-hf-muted" onClick={() => void toggleArchive(p)}>
                    {p.status === 'archived' ? 'Publicar' : 'Arquivar (remover da loja)'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
