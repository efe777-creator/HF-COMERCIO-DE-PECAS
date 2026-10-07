import { Button } from '@/components/common/Button'
import { Input } from '@/components/common/Input'
import { Loading } from '@/components/common/Loading'
import { adminListBrands } from '@/services/admin/adminBrandService'
import { adminListCategories } from '@/services/admin/adminCategoryService'
import {
  adminDeleteImage,
  adminListImages,
  adminSetPrimaryImage,
  adminUploadImage,
} from '@/services/admin/adminImageService'
import { adminListManufacturers } from '@/services/admin/adminManufacturerService'
import {
  adminAddApplication,
  adminDeleteReference,
  adminGetProduct,
  adminListApplications,
  adminListReferences,
  adminReleaseProductToStore,
  adminRemoveApplication,
  adminUpsertProduct,
  adminUpsertReference,
} from '@/services/admin/adminProductService'
import {
  adminClearPriceOverride,
  adminGetActivePriceOverride,
  adminUpsertPriceOverride,
} from '@/services/admin/adminPriceOverrideService'
import {
  PRICE_LIST_BASE_ID,
  PRICE_LIST_PROMO_ID,
  adminListPriceLists,
  adminListProductListPrices,
  type ProductListPriceRow,
} from '@/services/admin/adminPriceListService'
import { adminListSuppliers } from '@/services/admin/adminSupplierService'
import { adminListModels, adminListVersions } from '@/services/admin/adminVehicleService'
import { useAuth } from '@/contexts/AuthContext'
import { datetimeLocalToIso, isoToDatetimeLocal } from '@/lib/datetime'
import { entityStatusLabel, productReferenceTypeLabel } from '@/lib/adminLabels'
import { formatMoney, formatMoneyInput, parseMoneyBr } from '@/lib/money'
import {
  POSICAO_ATOMS,
  composePosicao,
  parsePosicaoAtoms,
  type PosicaoAtom,
} from '@/lib/productPosicaoLado'
import type {
  Category,
  Manufacturer,
  Product,
  ProductBrand,
  ProductImage,
  ProductReference,
  Supplier,
  VehicleModel,
  VehicleVersion,
} from '@/types'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

export function AdminProductFormPage() {
  const { id } = useParams()
  const isNew = !id || id === 'novo'
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [releasing, setReleasing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [productId, setProductId] = useState<string | null>(isNew ? null : id)

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [status, setStatus] = useState<NonNullable<Product['status']>>('draft')
  /** Hierarquia admin: Grupo → Categoria → Subcategoria (folha salva em products.category_id). */
  const [catGrupoId, setCatGrupoId] = useState('')
  const [catCategoriaId, setCatCategoriaId] = useState('')
  const [catSubId, setCatSubId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [supplierId, setSupplierId] = useState('')

  const categoryId = catSubId || catCategoriaId || catGrupoId || ''
  /** Preços nas listas — somente leitura (exceto preço inicial Base no novo produto). */
  const [listRows, setListRows] = useState<ProductListPriceRow[]>([])
  /** Espelho products.price / promo_price (não editáveis na UI após criação). */
  const [mirrorPrice, setMirrorPrice] = useState(0)
  const [mirrorPromo, setMirrorPromo] = useState<number | null>(null)
  /** Só no cadastro novo: semente da Lista Base. */
  const [initialBasePrice, setInitialBasePrice] = useState('')
  const [overrideEnabled, setOverrideEnabled] = useState(false)
  const [overrideAmount, setOverrideAmount] = useState('')
  const [overrideNote, setOverrideNote] = useState('')
  const [overrideValidFrom, setOverrideValidFrom] = useState('')
  const [overrideValidUntil, setOverrideValidUntil] = useState('')
  const [available, setAvailable] = useState(false)
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [widthCm, setWidthCm] = useState('')
  const [lengthCm, setLengthCm] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [description, setDescription] = useState('')
  const [posicaoAtoms, setPosicaoAtoms] = useState<PosicaoAtom[]>([])
  const [lado, setLado] = useState<Product['lado']>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<ProductBrand[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [refs, setRefs] = useState<ProductReference[]>([])
  const [apps, setApps] = useState<unknown[]>([])
  const [images, setImages] = useState<ProductImage[]>([])

  const [refCode, setRefCode] = useState('')
  const [refType, setRefType] = useState('manufacturer')

  const [makers, setMakers] = useState<Manufacturer[]>([])
  const [models, setModels] = useState<VehicleModel[]>([])
  const [versions, setVersions] = useState<VehicleVersion[]>([])
  const [makerId, setMakerId] = useState('')
  const [modelId, setModelId] = useState('')
  const [versionId, setVersionId] = useState('')

  useEffect(() => {
    void (async () => {
      const [cats, brs, sups, mfrs, lists] = await Promise.all([
        adminListCategories(),
        adminListBrands(),
        adminListSuppliers(),
        adminListManufacturers(),
        adminListPriceLists(),
      ])
      // Só published na lista; preserva nós extras (ex. arquivados do produto em edição).
      setCategories((prev) => {
        const published = cats.filter((c) => c.status === 'published')
        const extras = prev.filter(
          (c) => c.status !== 'published' && !published.some((p) => p.id === c.id),
        )
        return [...published, ...extras]
      })
      setBrands(brs.filter((b) => b.status === 'active'))
      setSuppliers(sups.filter((s) => s.status === 'active'))
      setMakers(mfrs.filter((m) => m.status === 'active'))
      if (isNew) {
        setListRows(
          lists.map((l) => ({
            priceListId: l.id,
            listName: l.name,
            listSlug: l.slug,
            status: l.status,
            priority: l.priority,
            isDefault: l.isDefault,
            itemId: null,
            price: null,
          })),
        )
      }
    })()
  }, [isNew])

  useEffect(() => {
    if (isNew || !id) return
    void (async () => {
      setLoading(true)
      try {
        const p = await adminGetProduct(id)
        if (!p) throw new Error('Produto não encontrado')
        setProductId(p.id)
        setName(p.name)
        setSku(p.sku)
        setStatus(p.status ?? 'draft')
        {
          const leaf = p.categoryId ?? ''
          const path: string[] = []
          let cur: string | null = leaf || null
          const byId = new Map((await adminListCategories()).map((c) => [c.id, c]))
          while (cur) {
            path.unshift(cur)
            cur = byId.get(cur)?.parentId ?? null
          }
          setCatGrupoId(path[0] ?? '')
          setCatCategoriaId(path[1] ?? '')
          setCatSubId(path[2] ?? '')
          // Garante nós do produto (mesmo arquivados) para edição não “perder” a seleção.
          setCategories((prev) => {
            const ids = new Set(prev.map((c) => c.id))
            const extra = path
              .map((id) => byId.get(id))
              .filter((c): c is Category => Boolean(c) && !ids.has(c!.id))
            return extra.length ? [...prev, ...extra] : prev
          })
        }
        setBrandId(p.brandId ?? '')
        setSupplierId(p.supplierId ?? '')
        setAvailable(Boolean(p.available))
        setMirrorPrice(p.price)
        setMirrorPromo(p.promoPrice ?? null)
        setWeightKg(p.weightKg != null ? String(p.weightKg) : '')
        setHeightCm(p.heightCm != null ? String(p.heightCm) : '')
        setWidthCm(p.widthCm != null ? String(p.widthCm) : '')
        setLengthCm(p.lengthCm != null ? String(p.lengthCm) : '')
        setShortDescription(p.shortDescription ?? '')
        setDescription(p.description ?? '')
        setPosicaoAtoms(parsePosicaoAtoms(p.posicao))
        setLado(p.lado ?? null)

        const [rows, ov] = await Promise.all([
          adminListProductListPrices(p.id),
          adminGetActivePriceOverride(p.id),
        ])
        setListRows(rows)

        if (ov) {
          setOverrideEnabled(true)
          setOverrideAmount(formatMoneyInput(ov.amount))
          setOverrideNote(ov.note ?? '')
          setOverrideValidFrom(isoToDatetimeLocal(ov.validFrom))
          setOverrideValidUntil(isoToDatetimeLocal(ov.validUntil))
        } else {
          setOverrideEnabled(false)
          setOverrideAmount('')
          setOverrideNote('')
          setOverrideValidFrom('')
          setOverrideValidUntil('')
        }
        setRefs(await adminListReferences(p.id))
        setApps(await adminListApplications(p.id))
        setImages(await adminListImages(p.id))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro')
      } finally {
        setLoading(false)
      }
    })()
  }, [id, isNew])

  useEffect(() => {
    if (!makerId) {
      setModels([])
      return
    }
    void adminListModels(makerId).then(setModels)
  }, [makerId])

  useEffect(() => {
    if (!modelId) {
      setVersions([])
      return
    }
    void adminListVersions(modelId).then(setVersions)
  }, [modelId])

  async function onLiberarNaLoja() {
    if (!productId) return
    const publishIfNeeded = status !== 'published'
    const ok = window.confirm(
      publishIfNeeded
        ? 'Liberar na loja?\n\n• Publicar o produto (status → published)\n• Exigir preço > 0 na lista padrão/ativa ou avulso\n• Marcar disponível (is_available)\n\nConfirmar?'
        : 'Liberar na loja?\n\n• Status já publicado\n• Exigir preço > 0 na lista padrão/ativa ou avulso\n• Marcar disponível (is_available)\n\nConfirmar?',
    )
    if (!ok) return
    setReleasing(true)
    setError(null)
    setMessage(null)
    try {
      const result = await adminReleaseProductToStore({
        productId,
        publishIfNeeded,
      })
      if (!result.ok) {
        setError(result.reason)
        return
      }
      setAvailable(true)
      setStatus('published')
      setMessage(
        result.publishedNow
          ? 'Produto publicado e liberado na loja.'
          : 'Produto liberado na loja.',
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao liberar na loja')
    } finally {
      setReleasing(false)
    }
  }

  async function saveGeneral(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      let priceNum: number
      let promoNum: number | null = null

      if (isNew) {
        const baseParsed = parseMoneyBr(initialBasePrice)
        if (baseParsed == null || baseParsed < 0) {
          throw new Error('Informe o preço inicial da Lista Base.')
        }
        priceNum = baseParsed
        promoNum = null
      } else {
        const baseFromList = listRows.find((r) => r.priceListId === PRICE_LIST_BASE_ID)?.price
        const promoFromList = listRows.find((r) => r.priceListId === PRICE_LIST_PROMO_ID)?.price
        priceNum = baseFromList ?? mirrorPrice
        promoNum = promoFromList ?? mirrorPromo
      }

      if (overrideEnabled) {
        const overrideNum = parseMoneyBr(overrideAmount)
        if (overrideNum == null || overrideNum < 0) {
          throw new Error('Informe o valor do preço avulso.')
        }
      }

      const saved = await adminUpsertProduct({
        id: productId ?? undefined,
        name,
        sku: sku.trim(),
        status,
        categoryId: categoryId || null,
        brandId: brandId || null,
        supplierId: supplierId || null,
        price: priceNum,
        promoPrice: promoNum,
        isAvailable: available,
        weightKg: weightKg.trim() ? Number(weightKg) : null,
        heightCm: heightCm.trim() ? Number(heightCm) : null,
        widthCm: widthCm.trim() ? Number(widthCm) : null,
        lengthCm: lengthCm.trim() ? Number(lengthCm) : null,
        shortDescription,
        description,
        posicao: composePosicao(posicaoAtoms),
        lado: lado || null,
        // Novo: semente Base via ensure. Edição: não mexer nas listas aqui.
        syncBasePromoLists: isNew,
      })
      setProductId(saved.id)
      setMirrorPrice(saved.price)
      setMirrorPromo(saved.promoPrice ?? null)

      if (overrideEnabled) {
        const overrideNum = parseMoneyBr(overrideAmount)!
        await adminUpsertPriceOverride({
          productId: saved.id,
          amount: overrideNum,
          note: overrideNote,
          status: 'active',
          validFrom: datetimeLocalToIso(overrideValidFrom),
          validUntil: datetimeLocalToIso(overrideValidUntil),
          changedBy: user?.id ?? null,
        })
      } else {
        await adminClearPriceOverride(saved.id, user?.id ?? null)
      }

      if (!isNew) {
        setListRows(await adminListProductListPrices(saved.id))
      }

      if (isNew) navigate(`/admin/produtos/${saved.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loading label="Carregando produto…" />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold text-hf-ink">
          {isNew ? 'Novo produto' : 'Editar produto'}
        </h1>
        <Link to="/admin/produtos" className="text-sm font-semibold text-hf-auth-link">
          Voltar à lista
        </Link>
      </div>
      {error ? <p className="text-sm text-hf-danger">{error}</p> : null}

      <form onSubmit={saveGeneral} className="space-y-4 rounded-[14px] border border-hf-line bg-hf-surface p-4">
        <h2 className="font-extrabold text-hf-ink">Geral</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input
            label="Código referência"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            required
            hint="Campo técnico: sku"
          />
          <fieldset className="text-sm md:col-span-2">
            <legend className="mb-1 block font-semibold text-hf-ink">Classificação</legend>
            <p className="mb-2 text-xs text-hf-muted">
              Só categorias publicadas. Cadastre novas em Admin → Categorias (ou via importação
              depois de cadastrar a hierarquia).
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="text-sm">
                <span className="mb-1 block font-semibold">Grupo</span>
                <select
                  className="w-full rounded-[10px] border border-hf-line px-3 py-2"
                  value={catGrupoId}
                  onChange={(e) => {
                    setCatGrupoId(e.target.value)
                    setCatCategoriaId('')
                    setCatSubId('')
                  }}
                >
                  <option value="">—</option>
                  {categories
                    .filter((c) => !c.parentId)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold">Categoria</span>
                <select
                  className="w-full rounded-[10px] border border-hf-line px-3 py-2"
                  value={catCategoriaId}
                  disabled={!catGrupoId}
                  onChange={(e) => {
                    setCatCategoriaId(e.target.value)
                    setCatSubId('')
                  }}
                >
                  <option value="">—</option>
                  {categories
                    .filter((c) => c.parentId === catGrupoId)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-semibold">Subcategoria</span>
                <select
                  className="w-full rounded-[10px] border border-hf-line px-3 py-2"
                  value={catSubId}
                  disabled={!catCategoriaId}
                  onChange={(e) => setCatSubId(e.target.value)}
                >
                  <option value="">—</option>
                  {categories
                    .filter((c) => c.parentId === catCategoriaId)
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          </fieldset>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Fabricante</span>
            <select className="w-full rounded-[10px] border border-hf-line px-3 py-2" value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">—</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Fornecedor</span>
            <select className="w-full rounded-[10px] border border-hf-line px-3 py-2" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <fieldset className="text-sm md:col-span-2">
            <legend className="mb-1 block font-semibold text-hf-ink">Posição</legend>
            <p className="mb-2 text-xs text-hf-muted">
              Pode combinar (ex.: Dianteira + Inferior). Na planilha: DIANT, TRAS, SUPERIOR,
              INFERIOR ou “DIANT INFERIOR”.
            </p>
            <div className="flex flex-wrap gap-3">
              {(
                [
                  ['DIANTEIRA', 'Dianteira (DIANT)'],
                  ['TRASEIRA', 'Traseira (TRAS)'],
                  ['SUPERIOR', 'Superior'],
                  ['INFERIOR', 'Inferior'],
                ] as const
              ).map(([atom, label]) => {
                const checked = posicaoAtoms.includes(atom)
                return (
                  <label key={atom} className="inline-flex items-center gap-2 font-normal">
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
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Lado</span>
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
          <label className="text-sm">
            <span className="mb-1 block font-semibold">Status</span>
            <select className="w-full rounded-[10px] border border-hf-line px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value as Product['status'] & string)}>
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
              <option value="archived">Arquivado (fora da loja)</option>
            </select>
          </label>
        </div>

        <h2 className="pt-2 font-extrabold text-hf-ink">Precificação</h2>
        <p className="m-0 text-sm text-hf-muted">
          Preços de lista são só leitura aqui. Para alterar, use{' '}
          <Link to="/admin/precos" className="font-semibold text-hf-ink underline">
            Listas de preços
          </Link>
          . Neste formulário você pode apenas <strong>ativar ou editar o preço avulso</strong> (exceção).
        </p>
        <div className="rounded-[12px] border border-hf-line bg-hf-surface p-3">
          <p className="m-0 text-sm font-extrabold text-hf-ink">Disponibilidade na loja</p>
          <p className="mt-1 text-xs text-hf-muted">
            Importação de custo/preço não libera o produto. Use{' '}
            <strong>Liberar na loja</strong> quando status, preço e confirmação estiverem ok.
          </p>
          <p className="mt-2 text-sm">
            Situação:{' '}
            <strong className={available ? 'text-green-700' : 'text-hf-muted'}>
              {available ? 'Disponível' : 'Indisponível'}
            </strong>
            {status !== 'published' ? (
              <span className="ml-2 text-xs text-hf-red-bright-dark">(status ≠ publicado)</span>
            ) : null}
          </p>
          {!isNew && productId ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={releasing || available}
                onClick={() => void onLiberarNaLoja()}
              >
                {releasing ? 'Liberando…' : 'Liberar na loja'}
              </Button>
              {available ? (
                <Button
                  type="button"
                  variant="light"
                  disabled={saving}
                  onClick={() => setAvailable(false)}
                >
                  Marcar indisponível (salvar depois)
                </Button>
              ) : null}
            </div>
          ) : (
            <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
              />
              Disponível na loja (após criar, use Liberar com checklist)
            </label>
          )}
        </div>
        {message ? <p className="m-0 text-sm font-semibold text-hf-ink">{message}</p> : null}

        {isNew ? (
          <Input
            label="Preço inicial (Lista Base)"
            inputMode="decimal"
            placeholder="0,00"
            value={initialBasePrice}
            onChange={(e) => setInitialBasePrice(e.target.value)}
            hint="Após criar o produto, alterações de preço de lista só em /admin/precos."
            required
          />
        ) : null}

        <div className="space-y-2 rounded-[12px] border border-hf-line bg-hf-bg/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="m-0 text-sm font-extrabold text-hf-ink">Preços nas listas</h3>
            <Link to="/admin/precos" className="text-xs font-semibold text-hf-ink underline">
              Gerenciar em Listas de preços
            </Link>
          </div>
          {listRows.length === 0 ? (
            <p className="m-0 text-sm text-hf-muted">Nenhuma lista cadastrada.</p>
          ) : (
            <ul className="m-0 list-none space-y-1.5 p-0">
              {listRows.map((row) => (
                <li
                  key={row.priceListId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-hf-line bg-hf-surface px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-semibold text-hf-ink">{row.listName}</span>
                    <span className="ml-2 text-xs text-hf-muted">
                      {row.status}
                      {row.isDefault ? ' · padrão' : ''}
                      {row.priceListId === PRICE_LIST_BASE_ID ? ' · Base' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <strong>
                      {row.price != null ? formatMoney(row.price) : '—'}
                    </strong>
                    <Link
                      to={`/admin/precos/${row.priceListId}`}
                      className="text-xs font-semibold text-hf-auth-link underline"
                    >
                      Abrir lista
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid gap-3 rounded-[12px] border border-hf-red/60 bg-[#fffdf3] p-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm font-semibold md:col-span-2">
            <input
              type="checkbox"
              checked={overrideEnabled}
              onChange={(e) => setOverrideEnabled(e.target.checked)}
            />
            Ativar preço avulso
          </label>
          <p className="m-0 text-sm text-hf-muted md:col-span-2">
            Enquanto ativo, o avulso sobrescreve qualquer lista na vitrine e no checkout.
          </p>
          {overrideEnabled ? (
            <>
              <Input
                label="Valor avulso"
                inputMode="decimal"
                placeholder="0,00"
                value={overrideAmount}
                onChange={(e) => setOverrideAmount(e.target.value)}
                required
              />
              <Input
                label="Motivo / nota"
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
                placeholder="Ex.: acordo comercial pontual"
              />
              <Input
                label="Válido de (opcional)"
                type="datetime-local"
                value={overrideValidFrom}
                onChange={(e) => setOverrideValidFrom(e.target.value)}
              />
              <Input
                label="Válido até (opcional)"
                type="datetime-local"
                value={overrideValidUntil}
                onChange={(e) => setOverrideValidUntil(e.target.value)}
              />
            </>
          ) : null}
        </div>

        <h2 className="pt-2 font-extrabold text-hf-ink">Logística (opcional)</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <Input label="Peso (kg)" type="number" step="0.001" min="0" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
          <Input label="Altura (cm)" type="number" step="0.01" min="0" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
          <Input label="Largura (cm)" type="number" step="0.01" min="0" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} />
          <Input label="Comprimento (cm)" type="number" step="0.01" min="0" value={lengthCm} onChange={(e) => setLengthCm(e.target.value)} />
        </div>

        <h2 className="pt-2 font-extrabold text-hf-ink">Descrição</h2>
        <Input label="Descrição curta" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} />
        <label className="block text-sm">
          <span className="mb-1 block font-semibold">Descrição completa</span>
          <textarea className="min-h-28 w-full rounded-[10px] border border-hf-line px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>

        <Button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar produto'}</Button>
      </form>

      {productId ? (
        <>
          <section className="space-y-3 rounded-[14px] border border-hf-line bg-hf-surface p-4">
            <h2 className="font-extrabold text-hf-ink">Referências</h2>
            <div className="flex flex-wrap gap-2">
              <Input label="Código" value={refCode} onChange={(e) => setRefCode(e.target.value)} />
              <label className="text-sm">
                <span className="mb-1 block font-semibold">Tipo</span>
                <select className="rounded-[10px] border border-hf-line px-3 py-2" value={refType} onChange={(e) => setRefType(e.target.value)}>
                  <option value="manufacturer">Código do fabricante</option>
                  <option value="oem">Código OEM (montadora)</option>
                  <option value="internal">Código interno</option>
                  <option value="competitor">Código concorrente</option>
                  <option value="other">Outro</option>
                </select>
              </label>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={() =>
                    void adminUpsertReference({ productId, code: refCode, type: refType })
                      .then(async () => {
                        setRefCode('')
                        setRefs(await adminListReferences(productId))
                      })
                      .catch((e) => setError(String(e.message ?? e)))
                  }
                >
                  Adicionar
                </Button>
              </div>
            </div>
            <ul className="space-y-1 text-sm">
              {refs.map((r) => (
                <li key={r.id ?? r.code} className="flex justify-between border-b border-hf-line py-1">
                  <span>
                    <strong>{r.code}</strong> · {productReferenceTypeLabel(r.type)} ·{' '}
                    {entityStatusLabel(r.status)}
                  </span>
                  {r.id ? (
                    <button type="button" className="text-hf-danger font-semibold" onClick={() => void adminDeleteReference(r.id!).then(async () => setRefs(await adminListReferences(productId)))}>
                      Remover
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3 rounded-[14px] border border-hf-line bg-hf-surface p-4">
            <h2 className="font-extrabold text-hf-ink">Aplicações</h2>
            <div className="grid gap-2 md:grid-cols-4">
              <select className="rounded-[10px] border border-hf-line px-3 py-2" value={makerId} onChange={(e) => setMakerId(e.target.value)}>
                <option value="">Montadora</option>
                {makers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select className="rounded-[10px] border border-hf-line px-3 py-2" value={modelId} onChange={(e) => setModelId(e.target.value)}>
                <option value="">Modelo</option>
                {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select className="rounded-[10px] border border-hf-line px-3 py-2" value={versionId} onChange={(e) => setVersionId(e.target.value)}>
                <option value="">Configuração</option>
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {[v.year ?? 'ano?', v.engine ?? 'motor?', v.versionName ?? 'versão?'].join(' / ')}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                disabled={!versionId}
                onClick={() =>
                  void adminAddApplication(productId, versionId)
                    .then(async () => {
                      setVersionId('')
                      setApps(await adminListApplications(productId))
                    })
                    .catch((e) => setError(String(e.message ?? e)))
                }
              >
                Vincular
              </Button>
            </div>
            <ul className="space-y-1 text-sm">
              {apps.map((a) => {
                const row = a as {
                  id: string
                  vehicle_versions?: {
                    year: number | null
                    engine: string | null
                    version_name: string | null
                    manufacturers?: { name: string } | { name: string }[]
                    models?: { name: string } | { name: string }[]
                  }
                }
                const vv = row.vehicle_versions
                const maker = Array.isArray(vv?.manufacturers) ? vv?.manufacturers[0]?.name : vv?.manufacturers?.name
                const model = Array.isArray(vv?.models) ? vv?.models[0]?.name : vv?.models?.name
                return (
                  <li key={row.id} className="flex justify-between border-b border-hf-line py-1">
                    <span>{[maker, model, vv?.year, vv?.engine, vv?.version_name].filter(Boolean).join(' ')}</span>
                    <button type="button" className="font-semibold text-hf-danger" onClick={() => void adminRemoveApplication(row.id).then(async () => setApps(await adminListApplications(productId)))}>
                      Remover
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="space-y-3 rounded-[14px] border border-hf-line bg-hf-surface p-4">
            <h2 className="font-extrabold text-hf-ink">Imagens</h2>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                void adminUploadImage(productId, file)
                  .then(async () => setImages(await adminListImages(productId)))
                  .catch((err) => setError(String(err.message ?? err)))
              }}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              {images.map((img) => (
                <div key={img.id} className="rounded-[10px] border border-hf-line p-2">
                  <img src={img.publicUrl} alt={img.alt ?? ''} className="h-32 w-full object-contain" />
                  <div className="mt-2 flex gap-2 text-xs">
                    {img.isPrimary ? (
                      <span className="font-bold text-hf-success">Principal</span>
                    ) : (
                      <button type="button" className="font-semibold text-hf-auth-link" onClick={() => void adminSetPrimaryImage(productId, img.id).then(async () => setImages(await adminListImages(productId)))}>
                        Tornar principal
                      </button>
                    )}
                    <button type="button" className="font-semibold text-hf-danger" onClick={() => void adminDeleteImage(img).then(async () => setImages(await adminListImages(productId)))}>
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {!images.length ? <p className="text-sm text-hf-muted">Sem imagem — produto marcado incompleto (cadastro permitido).</p> : null}
          </section>
        </>
      ) : null}
    </div>
  )
}
