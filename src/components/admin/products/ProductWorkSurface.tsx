import { ProductApplicationsEditor } from '@/components/admin/applications/ProductApplicationsEditor'
import {
  CategoryCascadeSelects,
  categoryCascadeToLeafId,
  pathToCascadeValue,
  type CategoryCascadeValue,
} from '@/components/admin/CategoryCascadeSelects'
import { AdminProductKitSection } from '@/components/admin/kits/AdminProductKitSection'
import { ProductEquivalencesEditor } from '@/components/admin/products/ProductEquivalencesEditor'
import { ProductGuidePricingPanel } from '@/components/admin/products/ProductGuidePricingPanel'
import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { productStatusLabel } from '@/lib/adminLabels'
import { formatMoney } from '@/lib/money'
import { CODIGO_REFERENCIA_LABEL } from '@/lib/productLabels'
import {
  POSICAO_ATOMS,
  composePosicao,
  parsePosicaoAtoms,
  type PosicaoAtom,
} from '@/lib/productPosicaoLado'
import {
  adminDeleteImage,
  adminListImages,
  adminSetPrimaryImage,
  adminUploadImage,
} from '@/services/admin/adminImageService'
import {
  adminDeleteReference,
  adminGetProduct,
  adminListKitsUsingProduct,
  adminListReferences,
  adminRemoveKitComponent,
  adminSetProductAvailable,
  adminUpdateKitComponentQuantity,
  adminUpsertProduct,
  adminUpsertReference,
} from '@/services/admin/adminProductService'
import type { Category, Product, ProductImage, ProductReference } from '@/types'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

export type ProductGuideMenuId =
  | 'identidade'
  | 'categoria'
  | 'precos'
  | 'aplicacoes'
  | 'midia'
  | 'referencias'
  | 'equivalencias'
  | 'kits'

const MENUS: { id: ProductGuideMenuId; label: string }[] = [
  { id: 'identidade', label: 'Identidade' },
  { id: 'categoria', label: 'Categoria' },
  { id: 'precos', label: 'Preços' },
  { id: 'aplicacoes', label: 'Aplicações' },
  { id: 'midia', label: 'Mídia' },
  { id: 'referencias', label: 'Referências' },
  { id: 'equivalencias', label: 'Equivalências' },
  { id: 'kits', label: 'Kits' },
]

const GUIDE_MENU_KEY = 'hf.products.guideMenu'

function readGuideMenu(): ProductGuideMenuId {
  try {
    const v = sessionStorage.getItem(GUIDE_MENU_KEY)
    if (MENUS.some((m) => m.id === v)) return v as ProductGuideMenuId
  } catch {
    /* ignore */
  }
  return 'identidade'
}

type Props = {
  focused: Product | null
  bulkPanel?: ReactNode | null
  categories: Category[]
  onClose: () => void
  onProductUpdated?: (product: Product) => void
  onLiberar?: (product: Product) => void
  onArchiveToggle?: (product: Product) => void
  busy?: boolean
}

export function ProductWorkSurface({
  focused,
  bulkPanel,
  categories,
  onClose,
  onProductUpdated,
  onLiberar,
  onArchiveToggle,
  busy,
}: Props) {
  const [searchParams] = useSearchParams()
  const [menu, setMenu] = useState<ProductGuideMenuId>(() => {
    const fromQuery = searchParams.get('section')
    if (fromQuery && MENUS.some((m) => m.id === fromQuery)) {
      return fromQuery as ProductGuideMenuId
    }
    return readGuideMenu()
  })
  const [product, setProduct] = useState<Product | null>(focused)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [status, setStatus] = useState<NonNullable<Product['status']>>('draft')
  const [available, setAvailable] = useState(false)
  const [posicaoAtoms, setPosicaoAtoms] = useState<PosicaoAtom[]>([])
  const [lado, setLado] = useState<Product['lado']>(null)
  const [cascade, setCascade] = useState<CategoryCascadeValue>({
    rootId: '',
    groupId: '',
    subId: '',
  })

  const [images, setImages] = useState<ProductImage[]>([])
  const [refs, setRefs] = useState<ProductReference[]>([])
  const [refCode, setRefCode] = useState('')
  const [refType, setRefType] = useState('oem')

  const [kitUsage, setKitUsage] = useState<
    { linkId: string; kitId: string; kitSku: string; kitName: string; quantity: number }[]
  >([])
  const [kitQtyEdits, setKitQtyEdits] = useState<Record<string, string>>({})

  const selectMenu = useCallback((id: ProductGuideMenuId) => {
    setMenu(id)
    try {
      sessionStorage.setItem(GUIDE_MENU_KEY, id)
    } catch {
      /* ignore */
    }
  }, [])

  const reloadProduct = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const p = await adminGetProduct(id)
      if (!p) throw new Error('Produto não encontrado')
      setProduct(p)
      setName(p.name)
      setSku(p.sku)
      setStatus(p.status ?? 'draft')
      setAvailable(Boolean(p.available))
      setPosicaoAtoms(parsePosicaoAtoms(p.posicao))
      setLado(p.lado ?? null)
      setCascade(pathToCascadeValue(categories, p.categoryId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar')
    } finally {
      setLoading(false)
    }
  }, [categories])

  useEffect(() => {
    if (!focused?.id) {
      setProduct(null)
      return
    }
    void reloadProduct(focused.id)
  }, [focused?.id, reloadProduct])

  useEffect(() => {
    if (!product?.id) return
    if (menu === 'midia') {
      void adminListImages(product.id)
        .then(setImages)
        .catch((e) => setError(String(e.message ?? e)))
    }
    if (menu === 'referencias') {
      void adminListReferences(product.id)
        .then(setRefs)
        .catch((e) => setError(String(e.message ?? e)))
    }
    if (menu === 'kits') {
      void adminListKitsUsingProduct(product.id)
        .then((rows) => {
          setKitUsage(rows)
          const q: Record<string, string> = {}
          for (const r of rows) q[r.linkId] = String(r.quantity)
          setKitQtyEdits(q)
        })
        .catch((e) => setError(String(e.message ?? e)))
    }
  }, [menu, product?.id, product?.productKind])

  if (bulkPanel && !focused) {
    return <div className="space-y-3">{bulkPanel}</div>
  }

  if (!focused || !product) {
    return (
      <p className="m-0 text-sm text-hf-muted">
        Selecione um produto e use Abrir guia (ou clique duplo).
      </p>
    )
  }

  async function saveIdentity() {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const saved = await adminUpsertProduct({
        id: product!.id,
        name,
        sku: sku.trim(),
        status,
        categoryId: product!.categoryId ?? null,
        brandId: product!.brandId ?? null,
        supplierId: product!.supplierId ?? null,
        price: product!.price,
        promoPrice: product!.promoPrice ?? null,
        isAvailable: available,
        shortDescription: product!.shortDescription,
        description: product!.description,
        posicao: composePosicao(posicaoAtoms),
        lado: lado || null,
      })
      await adminSetProductAvailable(product!.id, available)
      setProduct(saved)
      onProductUpdated?.(saved)
      setMessage('Identidade salva.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function saveCategory() {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const leaf = categoryCascadeToLeafId(cascade)
      const saved = await adminUpsertProduct({
        id: product!.id,
        name: product!.name,
        sku: product!.sku,
        status: product!.status,
        categoryId: leaf,
        brandId: product!.brandId ?? null,
        supplierId: product!.supplierId ?? null,
        price: product!.price,
        promoPrice: product!.promoPrice ?? null,
        isAvailable: product!.available,
        shortDescription: product!.shortDescription,
        description: product!.description,
        posicao: product!.posicao ?? null,
        lado: product!.lado ?? null,
      })
      setProduct(saved)
      onProductUpdated?.(saved)
      setMessage('Categoria salva.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha')
    } finally {
      setSaving(false)
    }
  }

  async function reloadKitUsage() {
    const rows = await adminListKitsUsingProduct(product!.id)
    setKitUsage(rows)
    const q: Record<string, string> = {}
    for (const r of rows) q[r.linkId] = String(r.quantity)
    setKitQtyEdits(q)
  }

  return (
    <div className="space-y-3 text-sm" data-product-ops-density="compact">
      <div className="rounded-[12px] border border-hf-line bg-hf-bg/50 p-3">
        <p className="m-0 text-xs text-hf-muted">{CODIGO_REFERENCIA_LABEL}</p>
        <p className="m-0 font-mono text-xs font-bold">{product.sku}</p>
        <p className="m-0 mt-1 font-extrabold text-hf-ink">{product.name}</p>
        <p className="m-0 mt-1 text-xs text-hf-muted">
          {productStatusLabel(product.status)}
          {product.available ? ' · disponível' : ' · indisponível'}
          {product.isIncomplete ? ' · incompleto' : ''}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Link
          to={`/admin/produtos/${product.id}`}
          className="inline-flex rounded-[8px] border border-hf-line bg-hf-surface px-2.5 py-1.5 text-xs font-semibold text-hf-ink hover:bg-hf-bg"
        >
          Abrir cadastro
        </Link>
        {onLiberar ? (
          <Button type="button" variant="light" disabled={busy || saving} onClick={() => onLiberar(product)}>
            Liberar na loja
          </Button>
        ) : null}
        {onArchiveToggle ? (
          <Button type="button" variant="light" disabled={busy || saving} onClick={() => onArchiveToggle(product)}>
            {product.status === 'archived' ? 'Desarquivar' : 'Arquivar'}
          </Button>
        ) : null}
        <Button type="button" variant="light" onClick={onClose}>
          Fechar guia
        </Button>
      </div>

      <div className="flex flex-wrap gap-1" data-product-guide-menus>
        {MENUS.map((m) => (
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
      {message ? <p className="m-0 text-xs font-semibold text-hf-ink">{message}</p> : null}
      {loading ? <p className="m-0 text-xs text-hf-muted">Carregando…</p> : null}

      <div className="rounded-[12px] border border-hf-line bg-hf-surface p-3">
        {menu === 'identidade' ? (
          <div className="space-y-2">
            <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="SKU / ref" value={sku} onChange={(e) => setSku(e.target.value)} />
            <label className="block text-sm">
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
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
              />
              Disponível na loja
            </label>
            <fieldset className="text-sm">
              <legend className="mb-1 block font-semibold text-hf-ink">Posição (produto)</legend>
              <p className="mb-1 text-[10px] text-hf-muted">
                Do cadastro do item — não da aplicação veicular.
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['DIANTEIRA', 'Dianteira'],
                    ['TRASEIRA', 'Traseira'],
                    ['SUPERIOR', 'Superior'],
                    ['INFERIOR', 'Inferior'],
                  ] as const
                ).map(([atom, label]) => {
                  const checked = posicaoAtoms.includes(atom)
                  return (
                    <label key={atom} className="inline-flex items-center gap-1.5 text-xs">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setPosicaoAtoms((prev) => {
                            const next = checked
                              ? prev.filter((a) => a !== atom)
                              : [...prev, atom]
                            return POSICAO_ATOMS.filter((a) => next.includes(a))
                          })
                        }}
                      />
                      {label}
                    </label>
                  )
                })}
              </div>
            </fieldset>
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Lado (produto)</span>
              <select
                className="w-full rounded-[10px] border border-hf-line px-3 py-2"
                value={lado ?? ''}
                onChange={(e) => setLado((e.target.value || null) as Product['lado'])}
              >
                <option value="">—</option>
                <option value="ESQUERDO">Esquerdo</option>
                <option value="DIREITO">Direito</option>
                <option value="AMBOS">Ambos</option>
              </select>
            </label>
            <Button type="button" disabled={saving} onClick={() => void saveIdentity()}>
              {saving ? 'Salvando…' : 'Salvar identidade'}
            </Button>
          </div>
        ) : null}

        {menu === 'categoria' ? (
          <div className="space-y-2">
            <CategoryCascadeSelects
              categories={categories}
              value={cascade}
              onChange={setCascade}
              idPrefix={`guia-${product.id}`}
              disabled={saving}
            />
            <Button type="button" disabled={saving} onClick={() => void saveCategory()}>
              {saving ? 'Salvando…' : 'Salvar categoria'}
            </Button>
          </div>
        ) : null}

        {menu === 'precos' ? (
          <ProductGuidePricingPanel
            productId={product.id}
            onSaved={() => {
              void reloadProduct(product.id).then(() => {
                setMessage('Preços salvos.')
              })
            }}
          />
        ) : null}

        {menu === 'aplicacoes' ? (
          <ProductApplicationsEditor productId={product.id} variant="embedded" />
        ) : null}

        {menu === 'equivalencias' ? (
          <ProductEquivalencesEditor
            productId={product.id}
            categories={categories}
            variant="embedded"
          />
        ) : null}

        {menu === 'midia' ? (
          <div className="space-y-2">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                void adminUploadImage(product.id, file)
                  .then(async () => {
                    setImages(await adminListImages(product.id))
                    await reloadProduct(product.id)
                    setMessage('Imagem enviada.')
                  })
                  .catch((err) => setError(String(err.message ?? err)))
                e.target.value = ''
              }}
            />
            <div className="grid grid-cols-2 gap-2">
              {images.map((img) => (
                <div key={img.id} className="rounded-[8px] border border-hf-line p-1">
                  <img src={img.publicUrl} alt="" className="h-20 w-full object-contain" />
                  <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                    {img.isPrimary ? (
                      <span className="font-bold">Principal</span>
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
                        void adminDeleteImage(img).then(async () => {
                          setImages(await adminListImages(product.id))
                          await reloadProduct(product.id)
                        })
                      }
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {menu === 'referencias' ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Input label="Código" value={refCode} onChange={(e) => setRefCode(e.target.value)} />
              <label className="text-sm">
                <span className="mb-1 block font-semibold">Tipo</span>
                <select
                  className="rounded-[10px] border border-hf-line px-3 py-2"
                  value={refType}
                  onChange={(e) => setRefType(e.target.value)}
                >
                  <option value="oem">OEM</option>
                  <option value="competitor">Concorrente</option>
                  <option value="other">Outro</option>
                </select>
              </label>
              <Button
                type="button"
                disabled={!refCode.trim()}
                onClick={() =>
                  void adminUpsertReference({
                    productId: product.id,
                    code: refCode.trim(),
                    type: refType,
                  })
                    .then(async () => {
                      setRefs(await adminListReferences(product.id))
                      setRefCode('')
                      setMessage('Referência adicionada.')
                    })
                    .catch((e) => setError(String(e.message ?? e)))
                }
              >
                Adicionar
              </Button>
            </div>
            <ul className="m-0 space-y-1 p-0 list-none text-xs">
              {refs.map((r) => (
                <li key={r.id ?? r.code} className="flex justify-between border-b border-hf-line py-1">
                  <span>
                    <strong>{r.code}</strong> · {r.type}
                  </span>
                  {r.id ? (
                    <button
                      type="button"
                      className="font-semibold text-hf-danger"
                      onClick={() =>
                        void adminDeleteReference(r.id!).then(async () =>
                          setRefs(await adminListReferences(product.id)),
                        )
                      }
                    >
                      Remover
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {menu === 'kits' ? (
          <div className="space-y-3">
            {product.productKind === 'kit' ? (
              <div className="space-y-2">
                <p className="m-0 rounded-[8px] border border-hf-line bg-hf-bg px-2 py-1.5 text-xs text-hf-muted">
                  Controle principal na tela Kits.{' '}
                  <Link className="font-semibold text-hf-auth-link" to={`/admin/kits/${product.id}`}>
                    Abrir ficha do kit
                  </Link>
                  {' · '}
                  <Link className="font-semibold text-hf-auth-link" to="/admin/kits">
                    Hub Kits
                  </Link>
                </p>
                <AdminProductKitSection
                  kitProductId={product.id}
                  compact
                  onError={setError}
                  onMessage={setMessage}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <p className="m-0 text-[10px] font-bold uppercase tracking-wide text-hf-muted">
                  Usado em kits
                </p>
                <p className="m-0 text-[11px] text-hf-muted">
                  Kits que já selecionaram este item na composição. Para montar kit novo, use a tela
                  Kits → Composição (seletor do cadastro).
                </p>
                {kitUsage.length === 0 ? (
                  <p className="m-0 text-xs text-hf-muted">Este item não entra em nenhum kit.</p>
                ) : (
                  <ul className="m-0 space-y-2 p-0 list-none text-xs">
                    {kitUsage.map((k) => (
                      <li
                        key={k.linkId}
                        className="flex flex-wrap items-end justify-between gap-2 border-b border-hf-line pb-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="m-0 font-bold">
                            {k.kitSku} · {k.kitName}
                          </p>
                          <div className="mt-1 flex flex-wrap items-end gap-2">
                            <Input
                              label="Qtd neste kit"
                              value={kitQtyEdits[k.linkId] ?? String(k.quantity)}
                              onChange={(e) =>
                                setKitQtyEdits((prev) => ({
                                  ...prev,
                                  [k.linkId]: e.target.value,
                                }))
                              }
                            />
                            <Button
                              type="button"
                              variant="light"
                              disabled={saving}
                              onClick={() => {
                                const qty = Number(
                                  String(kitQtyEdits[k.linkId] ?? k.quantity).replace(',', '.'),
                                )
                                if (!Number.isFinite(qty) || qty <= 0) {
                                  setError('Quantidade inválida')
                                  return
                                }
                                setSaving(true)
                                void adminUpdateKitComponentQuantity(k.linkId, qty)
                                  .then(async () => {
                                    await reloadKitUsage()
                                    setMessage('Quantidade no kit atualizada.')
                                  })
                                  .catch((e) => setError(String(e.message ?? e)))
                                  .finally(() => setSaving(false))
                              }}
                            >
                              Salvar qtd
                            </Button>
                            <button
                              type="button"
                              className="pb-2 font-semibold text-hf-danger"
                              onClick={() => {
                                if (!window.confirm(`Remover este item do kit ${k.kitSku}?`))
                                  return
                                void adminRemoveKitComponent(k.linkId)
                                  .then(async () => {
                                    await reloadKitUsage()
                                    setMessage('Removido do kit.')
                                  })
                                  .catch((e) => setError(String(e.message ?? e)))
                              }}
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                        <Link
                          className="font-semibold text-hf-auth-link"
                          to={`/admin/kits/${k.kitId}`}
                        >
                          Abrir kit
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <Link to="/admin/kits" className="text-xs font-semibold text-hf-auth-link">
                  Abrir tela Kits →
                </Link>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {product.price != null ? (
        <p className="m-0 text-[10px] text-hf-muted">Espelho products.price: {formatMoney(product.price)}</p>
      ) : null}
    </div>
  )
}
