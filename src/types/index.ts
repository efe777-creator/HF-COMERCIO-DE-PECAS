/**
 * Tipos centrais da HF Comércio de Peças
 * Preparados para entidades futuras do PRD — sem inventar schema definitivo.
 */

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error' | 'empty'

export interface UserProfile {
  id: string
  email: string | null
  /** Preparado para login por username (resolução segura no backend — não no frontend). */
  username?: string | null
  fullName?: string | null
  phone?: string | null
  role?: UserRole
  /** ID da empresa B2B vinculada via customer_users. */
  customerId?: string | null
  customerLegalName?: string | null
  customerStatus?: 'pending' | 'active' | 'suspended' | 'inactive' | null
  cpf?: string | null
  cnpj?: string | null
  /** Conta ativa com e-mail ainda não confirmado (navegação liberada). */
  emailConfirmed?: boolean
}

export interface CustomerAddress {
  id: string
  customerId: string
  label?: string | null
  recipient: string
  street: string
  number: string
  complement?: string | null
  reference?: string | null
  district?: string | null
  city: string
  state: string
  postalCode: string
  isDefault: boolean
}

/** Resultado normalizado de consulta CEP (UI desacoplada do fornecedor). */
export interface CepLookupResult {
  cep: string
  street: string
  district: string
  city: string
  state: string
}

export interface CepProvider {
  lookupByCep(cep: string): Promise<CepLookupResult>
}

export interface StoreShippingOrigin {
  id: string
  postalCode: string
  street: string
  number: string
  complement?: string | null
  district?: string | null
  city: string
  state: string
}

export interface CustomerSavedVehicle {
  id: string
  customerId: string
  manufacturerId?: string | null
  modelId?: string | null
  versionId: string
  year?: number | null
  engine?: string | null
  nickname?: string | null
  isPrimary: boolean
  /** Labels para UI */
  makerName?: string
  modelName?: string
  versionName?: string | null
}

/* Pedidos / frete / pagamento: fora do runtime MVP (flags off). Tipos removidos. */

/** Papéis staff/cliente — Fase 1. */
export type UserRole =
  | 'customer'
  | 'administrador'
  | 'gerente'
  | 'operador'
  | 'estoque'
  | 'atendimento'

export interface Category {
  id: string
  name: string
  slug: string
  description?: string
  emoji?: string
  parentId?: string | null
  sortOrder?: number
  status?: 'draft' | 'published' | 'archived'
}

export interface ProductReference {
  id?: string
  code: string
  type: string
  brandId?: string | null
  brandLabel?: string
  status?: 'active' | 'inactive'
}

export interface Product {
  id: string
  sku: string
  name: string
  slug: string
  description?: string
  shortDescription?: string
  brand?: string
  brandId?: string | null
  supplierId?: string | null
  categoryId?: string
  categoryName?: string
  categorySlug?: string
  price: number
  promoPrice?: number | null
  /** Preço resolvido pela lista comercial (F6B). */
  resolvedPrice?: number
  /** Preço da lista Base (espelho/legado). */
  listPrice?: number
  resolvedPriceListId?: string | null
  /** Origem da resolução (F6B.1). */
  priceSource?: 'override' | 'list' | 'default'
  /** Quantidade: só mocks/admin. Loja pública usa `available`. */
  stock?: number
  /** Disponibilidade pública (sem quantidade). */
  available?: boolean
  isIncomplete?: boolean
  status?: 'draft' | 'published' | 'archived'
  imageUrl?: string | null
  manufacturerCode?: string
  /**
   * Posição da peça (atributo do produto).
   * Átomos: DIANTEIRA, TRASEIRA, SUPERIOR, INFERIOR — combinações com `_`
   * (ex. DIANTEIRA_INFERIOR).
   */
  posicao?: string | null
  /** Lado da peça (atributo do produto). */
  lado?: 'ESQUERDO' | 'DIREITO' | 'AMBOS' | null
  compatibilitySummary?: string
  references?: ProductReference[]
  attrs?: Record<string, unknown>
  /** Logística opcional (F6C) — não inventar no seed. */
  weightKg?: number | null
  heightCm?: number | null
  widthCm?: number | null
  lengthCm?: number | null
}

export type EntityStatus = 'active' | 'inactive'

export interface Manufacturer {
  id: string
  name: string
  slug: string
  status: EntityStatus
}

export interface VehicleModel {
  id: string
  manufacturerId: string
  name: string
  slug: string
  status: EntityStatus
}

export interface VehicleVersion {
  id: string
  manufacturerId: string
  modelId: string
  year: number | null
  engine: string | null
  versionName: string | null
  status: EntityStatus
}

export interface ProductBrand {
  id: string
  name: string
  slug: string
  status: EntityStatus
}

export interface Supplier {
  id: string
  name: string
  code?: string | null
  status: EntityStatus
}

export interface ProductImage {
  id: string
  productId: string
  storagePath: string
  alt?: string | null
  sortOrder: number
  isPrimary: boolean
  publicUrl?: string
}

export interface VehicleFilter {
  /** Sempre "Montadora" na UI — nunca "marca do carro". */
  maker?: string
  model?: string
  year?: string
  engine?: string
  version?: string
}

/** Ordenação do motor de busca (Fase 4). */
export type ProductSearchSort =
  | 'relevance'
  | 'price_asc'
  | 'price_desc'
  | 'name_asc'
  | 'name_desc'
  | 'sku_asc'
  | 'sku_desc'

/** Parâmetros do contrato searchCatalog / RPC search_products. */
export interface ProductSearchParams {
  q?: string | null
  /** Slug, id ou nome da categoria (inclui filhas no backend). */
  category?: string | null
  /** Nome ou id do fabricante (product_brands). */
  brand?: string | null
  maker?: string | null
  model?: string | null
  year?: string | null
  engine?: string | null
  version?: string | null
  sort?: ProductSearchSort | null
  /** 1-based. */
  page?: number | null
  /** Padrão 24. */
  pageSize?: number | null
}

export interface ProductSearchResult {
  items: Product[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface VehicleOptionTree {
  makers: string[]
  modelsByMaker: Record<string, string[]>
  yearsByModel: Record<string, string[]>
  enginesByModelYear: Record<string, string[]>
  /** Motores por modelo (inclui configs com year NULL). */
  enginesByModel: Record<string, string[]>
  versionsByModel: Record<string, string[]>
}

/* Carrinho: fora do runtime MVP (cart_enabled: false). */
