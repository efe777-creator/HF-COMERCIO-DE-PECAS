import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import {
  adminDeleteImage,
  adminEnsureKitImageFromComponents,
  adminListImages,
  adminSetPrimaryImage,
  adminUploadImage,
} from '@/services/admin/adminImageService'
import { adminListCategories } from '@/services/admin/adminCategoryService'
import {
  adminAddKitComponent,
  adminGetProduct,
  adminListKitComponents,
  adminListProducts,
  adminReleaseProductToStore,
  adminRemoveKitComponent,
  adminUpdateKitComponentQuantity,
  adminUpsertProduct,
  isKitCompositionPublishable,
  type AdminKitComponentRow,
} from '@/services/admin/adminProductService'
import type { Category, Product, ProductImage } from '@/types'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

export function AdminKitFormPage() {
  const { id } = useParams()
  const isNew = !id || id === 'novo'
  const navigate = useNavigate()

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [productId, setProductId] = useState<string | null>(isNew ? null : id!)
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [status, setStatus] = useState<NonNullable<Product['status']>>('draft')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [shortDescription, setShortDescription] = useState('')

  const [kitRows, setKitRows] = useState<AdminKitComponentRow[]>([])
  const [kitQty, setKitQty] = useState('1')
  const [kitSearch, setKitSearch] = useState('')
  const [kitHits, setKitHits] = useState<Product[]>([])
  const [images, setImages] = useState<ProductImage[]>([])
  const [pullingPhotos, setPullingPhotos] = useState(false)
  const [releasing, setReleasing] = useState(false)

  const publishable = useMemo(() => isKitCompositionPublishable(kitRows), [kitRows])

  useEffect(() => {
    void adminListCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (isNew || !id) return
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const p = await adminGetProduct(id)
        if (!p) throw new Error('Kit não encontrado')
        if (p.productKind !== 'kit') {
          navigate(`/admin/produtos/${p.id}`, { replace: true })
          return
        }
        setProductId(p.id)
        setName(p.name)
        setSku(p.sku)
        setStatus(p.status ?? 'draft')
        setCategoryId(p.categoryId ?? '')
        setShortDescription(p.shortDescription ?? '')
        setKitRows(await adminListKitComponents(p.id))
        setImages(await adminListImages(p.id))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, isNew, navigate])

  async function saveIdentity(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const saved = await adminUpsertProduct({
        id: productId ?? undefined,
        name,
        sku: sku.trim(),
        status,
        categoryId: categoryId || null,
        price: 0,
        shortDescription,
        productKind: 'kit',
        syncBasePromoLists: isNew,
      })
      setProductId(saved.id)
      setMessage('Kit salvo.')
      if (isNew) navigate(`/admin/kits/${saved.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function searchItems() {
    setError(null)
    try {
      const list = await adminListProducts({ q: kitSearch, productKind: 'item' })
      setKitHits(list.filter((p) => p.id !== productId).slice(0, 12))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Busca falhou')
    }
  }

  async function addComponent(itemId: string) {
    if (!productId) return
    setError(null)
    try {
      const qty = Number(kitQty.replace(',', '.')) || 1
      await adminAddKitComponent(productId, itemId, qty)
      setKitRows(await adminListKitComponents(productId))
      setImages(await adminListImages(productId))
      setMessage('Item adicionado — fotos sincronizadas dos componentes.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao adicionar')
    }
  }

  async function pullPhotos() {
    if (!productId) return
    setPullingPhotos(true)
    setError(null)
    try {
      const changed = await adminEnsureKitImageFromComponents(
        productId,
        kitRows.map((r) => r.componentProductId),
      )
      setImages(await adminListImages(productId))
      setMessage(changed ? 'Fotos puxadas dos itens.' : 'Nada a sincronizar (já espelhadas ou itens sem foto).')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao puxar fotos')
    } finally {
      setPullingPhotos(false)
    }
  }

  async function liberar() {
    if (!productId) return
    if (!publishable) {
      setError('Composição insuficiente: use ≥2 itens ou 1 item com quantidade ≥ 2.')
      return
    }
    if (
      !window.confirm(
        'Liberar kit na loja?\n\n• Publicar\n• Marcar disponível\n\nConfirmar?',
      )
    ) {
      return
    }
    setReleasing(true)
    setError(null)
    try {
      await adminReleaseProductToStore({ productId, publishIfNeeded: true })
      setStatus('published')
      setMessage('Kit liberado na loja.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao liberar')
    } finally {
      setReleasing(false)
    }
  }

  if (loading) return <Loading label="Carregando kit…" />

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="m-0 text-2xl font-extrabold text-hf-ink">
            {isNew ? 'Novo kit' : 'Editar kit'}
          </h1>
          <p className="mt-1 text-sm text-hf-muted">
            Selecione os itens da composição. As fotos principais dos itens entram na galeria do
            kit (mesmo arquivo no Storage — como na FAL).
          </p>
        </div>
        <Link to="/admin/kits" className="text-sm font-semibold text-hf-auth-link">
          ← Lista de kits
        </Link>
      </div>

      {error ? <p className="text-sm text-hf-danger">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-hf-ink">{message}</p> : null}

      <form
        onSubmit={saveIdentity}
        className="space-y-3 rounded-[14px] border border-hf-line bg-hf-surface p-4"
      >
        <h2 className="m-0 font-extrabold text-hf-ink">Identidade</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} required />
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Categoria (folha)</span>
            <select
              className="w-full rounded-[10px] border border-hf-line px-3 py-2"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">—</option>
              {categories
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Status</span>
            <select
              className="w-full rounded-[10px] border border-hf-line px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value as Product['status'] & string)}
            >
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
              <option value="archived">Arquivado</option>
            </select>
          </label>
        </div>
        <Input
          label="Descrição curta"
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar kit'}
          </Button>
          {productId ? (
            <Button type="button" variant="light" disabled={releasing} onClick={() => void liberar()}>
              {releasing ? 'Liberando…' : 'Liberar na loja'}
            </Button>
          ) : null}
        </div>
      </form>

      {productId ? (
        <>
          <section className="space-y-3 rounded-[14px] border border-hf-line bg-hf-surface p-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="m-0 font-extrabold text-hf-ink">Composição (itens)</h2>
                <p className="m-0 mt-1 text-xs text-hf-muted">
                  Só produtos natureza Item. Publicação: ≥2 linhas ou 1 linha com qty ≥ 2.
                  {publishable ? (
                    <span className="ml-1 font-semibold text-emerald-700">OK para liberar.</span>
                  ) : (
                    <span className="ml-1 font-semibold text-amber-700">Composição incompleta.</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <Input
                label="Buscar item (SKU / nome)"
                value={kitSearch}
                onChange={(e) => setKitSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void searchItems()
                  }
                }}
              />
              <Input
                label="Qtd"
                value={kitQty}
                onChange={(e) => setKitQty(e.target.value)}
                className="w-24"
              />
              <Button type="button" variant="light" onClick={() => void searchItems()}>
                Buscar
              </Button>
            </div>

            {kitHits.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {kitHits.map((hit) => (
                  <li
                    key={hit.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-hf-line py-1"
                  >
                    <span>
                      <strong>{hit.sku}</strong> · {hit.name}
                    </span>
                    <Button type="button" onClick={() => void addComponent(hit.id)}>
                      Adicionar
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}

            <ul className="space-y-2 text-sm">
              {kitRows.length === 0 ? (
                <li className="text-hf-muted">Nenhum item no BOM.</li>
              ) : (
                kitRows.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-hf-line py-2"
                  >
                    <span>
                      <strong>{row.componentSku}</strong> · {row.componentName}
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0.001}
                        step="any"
                        className="w-20 rounded-[10px] border border-hf-line px-2 py-1"
                        value={row.quantity}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          setKitRows((prev) =>
                            prev.map((r) => (r.id === row.id ? { ...r, quantity: v } : r)),
                          )
                        }}
                        onBlur={() =>
                          void adminUpdateKitComponentQuantity(row.id, row.quantity)
                            .then(async () => {
                              if (productId) setKitRows(await adminListKitComponents(productId))
                            })
                            .catch((err) => setError(String(err.message ?? err)))
                        }
                      />
                      <button
                        type="button"
                        className="font-semibold text-hf-danger"
                        onClick={() =>
                          void adminRemoveKitComponent(row.id).then(async () => {
                            if (!productId) return
                            setKitRows(await adminListKitComponents(productId))
                            setImages(await adminListImages(productId))
                          })
                        }
                      >
                        Remover
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="space-y-3 rounded-[14px] border border-hf-line bg-hf-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="m-0 font-extrabold text-hf-ink">Mídia</h2>
              <Button
                type="button"
                variant="light"
                disabled={pullingPhotos || kitRows.length === 0}
                onClick={() => void pullPhotos()}
              >
                {pullingPhotos ? 'Puxando…' : 'Puxar fotos dos itens'}
              </Button>
            </div>
            <p className="m-0 text-xs text-hf-muted">
              Espelha a foto principal de cada item do BOM. Uploads próprios do kit (`{productId}/…`)
              não são removidos ao sincronizar.
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file || !productId) return
                void adminUploadImage(productId, file)
                  .then(async () => setImages(await adminListImages(productId)))
                  .catch((err) => setError(String(err.message ?? err)))
                e.target.value = ''
              }}
            />
            <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
              {images.map((img) => (
                <div key={img.id} className="rounded-[10px] border border-hf-line p-2">
                  <img src={img.publicUrl} alt={img.alt ?? ''} className="h-28 w-full object-contain" />
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    {img.isPrimary ? (
                      <span className="font-semibold text-hf-ink">Principal</span>
                    ) : (
                      <button
                        type="button"
                        className="font-semibold text-hf-auth-link"
                        onClick={() =>
                          void adminSetPrimaryImage(productId, img.id).then(async () =>
                            setImages(await adminListImages(productId)),
                          )
                        }
                      >
                        Tornar principal
                      </button>
                    )}
                    <button
                      type="button"
                      className="font-semibold text-hf-danger"
                      onClick={() =>
                        void adminDeleteImage(img).then(async () =>
                          setImages(await adminListImages(productId)),
                        )
                      }
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {!images.length ? (
              <p className="text-sm text-hf-muted">Sem imagem — use “Puxar fotos” ou faça upload.</p>
            ) : null}
          </section>
        </>
      ) : (
        <p className="text-sm text-hf-muted">Salve a identidade do kit para montar a composição.</p>
      )}
    </div>
  )
}
