import {
  CategoryCascadeSelects,
  categoryCascadeToLeafId,
  pathToCascadeValue,
  type CategoryCascadeValue,
} from '@/components/admin/CategoryCascadeSelects'
import { ProductApplicationsEditor } from '@/components/admin/applications/ProductApplicationsEditor'
import { AdminProductKitSection } from '@/components/admin/kits/AdminProductKitSection'
import { KitPullApplicationsPanel } from '@/components/admin/kits/KitPullApplicationsPanel'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { productStatusLabel } from '@/lib/adminLabels'
import {
  adminDeleteImage,
  adminListImages,
  adminSetPrimaryImage,
  adminUploadImage,
} from '@/services/admin/adminImageService'
import { adminListCategories } from '@/services/admin/adminCategoryService'
import {
  adminGetProduct,
  adminUpsertProduct,
} from '@/services/admin/adminProductService'
import type { Category, Product, ProductImage } from '@/types'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

export const KIT_GUIDE_MENU_KEY = 'hf.kits.guideMenu'

export type KitGuideMenuId = 'composicao' | 'identidade' | 'midia' | 'aplicacoes'

const GUIDE_MENUS: { id: KitGuideMenuId; label: string }[] = [
  { id: 'composicao', label: 'Composição' },
  { id: 'identidade', label: 'Identidade' },
  { id: 'midia', label: 'Mídia' },
  { id: 'aplicacoes', label: 'Aplicações' },
]

function readGuideMenu(): KitGuideMenuId {
  try {
    const v = sessionStorage.getItem(KIT_GUIDE_MENU_KEY)
    if (GUIDE_MENUS.some((m) => m.id === v)) return v as KitGuideMenuId
  } catch {
    /* ignore */
  }
  return 'composicao'
}

function persistGuideMenu(id: KitGuideMenuId) {
  try {
    sessionStorage.setItem(KIT_GUIDE_MENU_KEY, id)
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

type Props = {
  /** Criar rascunho na guia (padrão Adaptive / FAL). */
  quickCreate?: boolean
  focused?: Product | null
  busy?: boolean
  onClose: () => void
  onKitCreated?: (kit: Product) => void
  onKitUpdated?: (kit: Product) => void
  onLiberar?: (kit: Product) => void
  /** BOM alterado (lista / contadores). */
  onBomChanged?: () => void
}

/** Guia lateral de kits — criar rápido ou editar kit focado. */
export function KitWorkSurface({
  quickCreate = false,
  focused = null,
  busy,
  onClose,
  onKitCreated,
  onKitUpdated,
  onLiberar,
  onBomChanged,
}: Props) {
  const [menu, setMenu] = useState<KitGuideMenuId>(readGuideMenu)
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(!quickCreate && Boolean(focused?.id))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [images, setImages] = useState<ProductImage[]>([])
  const [appsKey, setAppsKey] = useState(0)

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [status, setStatus] = useState<NonNullable<Product['status']>>('draft')
  const [shortDescription, setShortDescription] = useState('')
  const [cascade, setCascade] = useState<CategoryCascadeValue>({
    rootId: '',
    groupId: '',
    subId: '',
  })

  const [createName, setCreateName] = useState('')
  const [createSku, setCreateSku] = useState('')
  const [createCascade, setCreateCascade] = useState<CategoryCascadeValue>({
    rootId: '',
    groupId: '',
    subId: '',
  })
  const [creating, setCreating] = useState(false)

  const selectMenu = useCallback((id: KitGuideMenuId) => {
    setMenu(id)
    persistGuideMenu(id)
  }, [])

  useEffect(() => {
    void adminListCategories().then(setCategories).catch(() => setCategories([]))
  }, [])

  useEffect(() => {
    if (quickCreate || !focused?.id) {
      setProduct(null)
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const p = await adminGetProduct(focused.id)
        if (cancelled) return
        if (!p) throw new Error('Kit não encontrado')
        if (p.productKind !== 'kit') throw new Error('Produto não é kit')
        setProduct(p)
        setName(p.name)
        setSku(p.sku)
        setStatus(p.status ?? 'draft')
        setShortDescription(p.shortDescription ?? '')
        setCascade(pathToCascadeValue(categories, p.categoryId))
        setImages(await adminListImages(p.id))
      } catch (e) {
        if (cancelled) return
        setError(errMsg(e, 'Erro ao carregar kit'))
        setProduct(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [focused?.id, quickCreate, categories])

  async function saveQuickDraft() {
    setCreating(true)
    setError(null)
    setMessage(null)
    try {
      if (!createName.trim()) throw new Error('Informe o nome do kit.')
      if (!createSku.trim()) throw new Error('Informe o SKU.')
      const leaf = categoryCascadeToLeafId(createCascade)
      if (!leaf) throw new Error('Informe a categoria.')
      const saved = await adminUpsertProduct({
        name: createName.trim(),
        sku: createSku.trim(),
        status: 'draft',
        categoryId: leaf,
        price: 0,
        productKind: 'kit',
        syncBasePromoLists: true,
        isAvailable: false,
      })
      setCreateName('')
      setCreateSku('')
      setCreateCascade({ rootId: '', groupId: '', subId: '' })
      setMessage('Kit rascunho criado — monte a composição na guia.')
      onKitCreated?.(saved)
    } catch (e) {
      setError(errMsg(e, 'Falha ao criar kit'))
    } finally {
      setCreating(false)
    }
  }

  async function saveIdentity() {
    if (!product) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const leaf = categoryCascadeToLeafId(cascade)
      const saved = await adminUpsertProduct({
        id: product.id,
        name,
        sku: sku.trim(),
        status,
        categoryId: leaf || null,
        price: product.price ?? 0,
        shortDescription,
        productKind: 'kit',
      })
      setProduct(saved)
      setMessage('Identidade salva.')
      onKitUpdated?.(saved)
    } catch (e) {
      setError(errMsg(e, 'Falha ao salvar'))
    } finally {
      setSaving(false)
    }
  }

  if (quickCreate) {
    return (
      <div className="space-y-3 text-sm" data-kit-guide-menus data-kit-ops-density="compact">
        <div className="rounded-[12px] border border-hf-line bg-hf-bg/50 p-3">
          <p className="m-0 text-xs text-hf-muted">Criar na guia</p>
          <p className="mb-0 mt-1 text-sm font-extrabold text-hf-ink">Novo kit (mínimo)</p>
          <p className="mb-0 mt-1 text-[11px] text-hf-muted">
            SKU, nome e categoria → salva rascunho e abre composição.
          </p>
        </div>
        {error ? <p className="m-0 text-xs text-hf-danger">{error}</p> : null}
        {message ? <p className="m-0 text-xs font-semibold text-emerald-300">{message}</p> : null}
        <div className="space-y-2 rounded-[12px] border border-hf-line bg-hf-surface p-3">
          <Input
            label="SKU"
            value={createSku}
            onChange={(e) => setCreateSku(e.target.value)}
            required
          />
          <Input
            label="Nome do kit"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            required
          />
          <fieldset>
            <legend className="mb-1 block text-xs font-extrabold text-hf-muted">Categoria</legend>
            <CategoryCascadeSelects
              categories={categories}
              value={createCascade}
              onChange={setCreateCascade}
            />
          </fieldset>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Button type="button" size="sm" disabled={creating} onClick={() => void saveQuickDraft()}>
              {creating ? 'Criando…' : 'Salvar e montar composição'}
            </Button>
            <Button type="button" variant="light" size="sm" onClick={onClose}>
              Fechar guia
            </Button>
            <Link to="/admin/kits/novo" className="text-xs font-semibold text-hf-auth-link">
              Ficha completa →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (loading) return <Loading label="Carregando kit…" />
  if (!product) {
    return (
      <div className="space-y-2 p-1 text-sm">
        <p className="text-xs text-hf-danger">{error ?? 'Kit indisponível'}</p>
        <Button type="button" variant="light" size="sm" onClick={onClose}>
          Fechar guia
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3 text-sm" data-kit-guide-menus data-kit-ops-density="compact">
      <div className="rounded-[12px] border border-hf-line bg-hf-bg/50 p-3">
        <p className="m-0 text-xs text-hf-muted">SKU / ref</p>
        <p className="m-0 font-mono text-xs font-bold">{product.sku}</p>
        <p className="m-0 mt-1 font-extrabold text-hf-ink">{product.name}</p>
        <p className="m-0 mt-1 text-xs text-hf-muted">
          {productStatusLabel(product.status)}
          {product.available ? ' · disponível' : ' · indisponível'}
          {' · kit'}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Link
          to={`/admin/kits/${product.id}`}
          className="inline-flex rounded-[8px] border border-hf-line bg-hf-surface px-2.5 py-1.5 text-xs font-semibold text-hf-ink hover:bg-hf-bg"
        >
          Abrir cadastro
        </Link>
        {onLiberar ? (
          <Button
            type="button"
            variant="light"
            size="sm"
            disabled={busy || saving}
            onClick={() => onLiberar(product)}
          >
            Liberar na loja
          </Button>
        ) : null}
        <Button type="button" variant="light" size="sm" onClick={onClose}>
          Fechar guia
        </Button>
      </div>

      <div className="flex flex-wrap gap-1" data-kit-guide-menu-pills>
        {GUIDE_MENUS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={[
              'rounded-full px-2.5 py-1 text-xs font-bold',
              menu === m.id
                ? 'bg-hf-red text-white'
                : 'border border-hf-line bg-hf-surface text-hf-ink hover:bg-hf-bg',
            ].join(' ')}
            onClick={() => selectMenu(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {error ? <p className="m-0 text-xs text-hf-danger">{error}</p> : null}
      {message ? <p className="m-0 text-xs font-semibold text-emerald-300">{message}</p> : null}

      <div className="min-h-0">
        {menu === 'composicao' ? (
          <AdminProductKitSection
            kitProductId={product.id}
            compact
            onError={setError}
            onMessage={setMessage}
            onChanged={() => {
              setError(null)
              void adminListImages(product.id).then(setImages)
              onBomChanged?.()
            }}
          />
        ) : null}

        {menu === 'identidade' ? (
          <div className="space-y-2 rounded-[12px] border border-hf-line bg-hf-surface p-3">
            <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
            <fieldset>
              <legend className="mb-1 block text-xs font-extrabold text-hf-muted">Categoria</legend>
              <CategoryCascadeSelects
                categories={categories}
                value={cascade}
                onChange={setCascade}
              />
            </fieldset>
            <label className="block">
              <span className="mb-1 block text-xs font-extrabold text-hf-muted">Status</span>
              <select
                className="w-full rounded-[9px] border border-hf-line bg-hf-surface px-3 py-2 text-hf-ink"
                value={status}
                onChange={(e) => setStatus(e.target.value as Product['status'] & string)}
              >
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
                <option value="archived">Arquivado</option>
              </select>
            </label>
            <Input
              label="Descrição curta"
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
            />
            <Button type="button" size="sm" disabled={saving} onClick={() => void saveIdentity()}>
              {saving ? 'Salvando…' : 'Salvar identidade'}
            </Button>
          </div>
        ) : null}

        {menu === 'midia' ? (
          <div className="space-y-2 rounded-[12px] border border-hf-line bg-hf-surface p-3">
            <p className="m-0 text-[11px] text-hf-muted">
              Preferência: Composição → Puxar fotos. Ou envie arquivo próprio.
            </p>
            <input
              type="file"
              accept="image/*"
              className="max-w-full text-xs"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                void adminUploadImage(product.id, file)
                  .then(async () => setImages(await adminListImages(product.id)))
                  .catch((err) => setError(errMsg(err, 'Falha no upload')))
                e.target.value = ''
              }}
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
              {images.map((img) => (
                <div key={img.id} className="rounded-[10px] border border-hf-line p-2">
                  <img
                    src={img.publicUrl}
                    alt={img.alt ?? ''}
                    className="h-20 w-full object-contain sm:h-24"
                  />
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                    {img.isPrimary ? (
                      <span className="font-semibold text-hf-ink">Principal</span>
                    ) : (
                      <button
                        type="button"
                        className="font-semibold text-hf-auth-link"
                        onClick={() =>
                          void adminSetPrimaryImage(product.id, img.id).then(async () =>
                            setImages(await adminListImages(product.id)),
                          )
                        }
                      >
                        Principal
                      </button>
                    )}
                    <button
                      type="button"
                      className="font-semibold text-hf-danger"
                      onClick={() =>
                        void adminDeleteImage(img).then(async () =>
                          setImages(await adminListImages(product.id)),
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
              <p className="m-0 text-xs text-hf-muted">Sem imagem — puxe dos itens ou envie arquivo.</p>
            ) : null}
          </div>
        ) : null}

        {menu === 'aplicacoes' ? (
          <div className="space-y-3">
            <KitPullApplicationsPanel
              kitProductId={product.id}
              onError={setError}
              onMessage={setMessage}
              onPulled={() => setAppsKey((k) => k + 1)}
            />
            <div className="overflow-x-auto rounded-[12px] border border-hf-line bg-hf-surface p-2 sm:p-3">
              <ProductApplicationsEditor
                key={appsKey}
                productId={product.id}
                variant="embedded"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
