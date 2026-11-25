import { ProductApplicationsEditor } from '@/components/admin/applications/ProductApplicationsEditor'
import { AdminProductKitSection } from '@/components/admin/kits/AdminProductKitSection'
import { KitPullApplicationsPanel } from '@/components/admin/kits/KitPullApplicationsPanel'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import {
  adminDeleteImage,
  adminListImages,
  adminSetPrimaryImage,
  adminUploadImage,
} from '@/services/admin/adminImageService'
import { adminListCategories } from '@/services/admin/adminCategoryService'
import {
  adminGetProduct,
  adminListKitComponents,
  adminReleaseProductToStore,
  adminUpsertProduct,
  isKitCompositionPublishable,
} from '@/services/admin/adminProductService'
import type { Category, Product, ProductImage } from '@/types'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

type FormTab = 'identidade' | 'composicao' | 'midia' | 'aplicacoes'

const TABS: { id: FormTab; label: string }[] = [
  { id: 'identidade', label: 'Identidade' },
  { id: 'composicao', label: 'Composição' },
  { id: 'midia', label: 'Mídia' },
  { id: 'aplicacoes', label: 'Aplicações' },
]

export function AdminKitFormPage() {
  const { id } = useParams()
  const isNew = !id || id === 'novo'
  const navigate = useNavigate()

  const [tab, setTab] = useState<FormTab>('identidade')
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
  const [images, setImages] = useState<ProductImage[]>([])
  const [releasing, setReleasing] = useState(false)
  const [appsKey, setAppsKey] = useState(0)

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
        setImages(await adminListImages(p.id))
        setTab('composicao')
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
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Falha ao salvar'
      setError(msg || 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function liberar() {
    if (!productId) return
    try {
      const bom = await adminListKitComponents(productId)
      if (!isKitCompositionPublishable(bom)) {
        setError('Composição insuficiente: use ≥2 itens ou 1 item com quantidade ≥ 2.')
        return
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao validar composição')
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
            Mesmos controles da guia Kits: composição, mídia e aplicações puxáveis dos itens.
          </p>
        </div>
        <Link to="/admin/kits" className="text-sm font-semibold text-hf-auth-link">
          ← Lista de kits
        </Link>
      </div>

      {error ? <p className="text-sm text-hf-danger">{error}</p> : null}
      {message ? <p className="text-sm font-semibold text-emerald-300">{message}</p> : null}

      {productId ? (
        <div className="flex flex-wrap gap-1 border-b border-hf-line pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`rounded-[8px] px-3 py-2 text-sm font-extrabold ${
                tab === t.id
                  ? 'bg-hf-surface-2 text-hf-ink'
                  : 'text-hf-muted hover:bg-hf-surface hover:text-hf-ink'
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
          <Button
            type="button"
            variant="light"
            className="ml-auto"
            disabled={releasing}
            onClick={() => void liberar()}
          >
            {releasing ? 'Liberando…' : 'Liberar na loja'}
          </Button>
        </div>
      ) : null}

      {(isNew || tab === 'identidade') && (
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
                className="w-full rounded-[10px] border border-hf-line bg-hf-surface-2 px-3 py-2 text-hf-ink"
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
                className="w-full rounded-[10px] border border-hf-line bg-hf-surface-2 px-3 py-2 text-hf-ink"
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
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar kit'}
          </Button>
        </form>
      )}

      {productId && tab === 'composicao' ? (
        <section className="rounded-[14px] border border-hf-line bg-hf-surface p-4">
          <AdminProductKitSection
            kitProductId={productId}
            onError={setError}
            onMessage={setMessage}
            onChanged={() => void adminListImages(productId).then(setImages)}
          />
        </section>
      ) : null}

      {productId && tab === 'midia' ? (
        <section className="space-y-3 rounded-[14px] border border-hf-line bg-hf-surface p-4">
          <h2 className="m-0 font-extrabold text-hf-ink">Mídia</h2>
          <p className="m-0 text-xs text-hf-muted">
            Puxe fotos na aba Composição (seleção por item) ou envie arquivo próprio do kit.
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
                <img
                  src={img.publicUrl}
                  alt={img.alt ?? ''}
                  className="h-28 w-full object-contain"
                />
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
            <p className="text-sm text-hf-muted">Sem imagem — use Composição → Puxar fotos.</p>
          ) : null}
        </section>
      ) : null}

      {productId && tab === 'aplicacoes' ? (
        <section className="space-y-3 rounded-[14px] border border-hf-line bg-hf-surface p-4">
          <KitPullApplicationsPanel
            kitProductId={productId}
            onError={setError}
            onMessage={setMessage}
            onPulled={() => setAppsKey((k) => k + 1)}
          />
          <ProductApplicationsEditor key={appsKey} productId={productId} />
        </section>
      ) : null}

      {!productId ? (
        <p className="text-sm text-hf-muted">Salve a identidade do kit para montar a composição.</p>
      ) : null}
    </div>
  )
}
