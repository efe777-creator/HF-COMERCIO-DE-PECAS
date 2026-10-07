/**
 * Tipos centrais da FAL Peças Automotivas
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
  /** ID da linha em customers (quando existir). */
  customerId?: string | null
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

export interface CustomerOrderSummary {
  id: string
  status: string
  total: number
  createdAt: string
  itemCount: number
}

export interface OrderItemSnapshot {
  id: string
  productId?: string | null
  sku: string
  nameSnapshot: string
  unitPrice: number
  quantity: number
}

export interface OrderStatusEvent {
  id: string
  status: string
  note?: string | null
  createdAt: string
}

export interface OrderLifecycleEvent {
  id: string
  eventType: string
  payload: Record<string, unknown>
  visibility: 'internal' | 'customer'
  createdAt: string
}

export interface OrderDetail {
  id: string
  status: string
  subtotal: number
  shippingAmount: number
  total: number
  createdAt: string
  addressSnapshot?: Record<string, unknown> | null
  paymentRef?: string | null
  items: OrderItemSnapshot[]
  history: OrderStatusEvent[]
  /** Eventos customer-visible (F7A). */
  events: OrderLifecycleEvent[]
  payment?: {
    id: string
    provider?: string | null
    status: string
    amount?: number | null
    externalRef?: string | null
  } | null
  shipment?: {
    id: string
    provider?: string | null
    status: string
    amount?: number | null
    trackingCode?: string | null
    metadata?: Record<string, unknown> | null
  } | null
}

/** Item logístico opcional na cotação (F6C; mock pode ignorar). */
export interface ShippingQuoteItem {
  productId: string
  quantity: number
  weightKg?: number | null
  heightCm?: number | null
  widthCm?: number | null
  lengthCm?: number | null
}

/** Cotação de frete — contrato interno FAL (F6 mock; F9 troca provider). */
export interface ShippingQuoteRequest {
  postalCode: string
  state: string
  city: string
  subtotal: number
  itemCount: number
  originPostalCode?: string
  items?: ShippingQuoteItem[]
  totalWeightKg?: number
}

export interface ShippingQuoteOption {
  id: string
  provider: string
  serviceCode: string
  label: string
  amount: number
  etaDaysMin?: number
  etaDaysMax?: number
  metadata?: Record<string, unknown>
}

export interface ShippingProvider {
  quote(req: ShippingQuoteRequest): Promise<ShippingQuoteOption[]>
}

export type SimulatedPaymentMethod = 'pix_simulated' | 'card_simulated'

/** Status interno F9-A (payments.status). `failed` = legado simulated. */
export type FalPaymentStatus =
  | 'created'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded'

export type FalPaymentMethod =
  | 'pix'
  | 'credit_card'
  | 'debit_card'
  | 'pix_simulated'
  | 'card_simulated'
  | 'other'

export interface PaymentIntentInput {
  orderId: string
  amount: number
  method: SimulatedPaymentMethod
}

export interface PaymentIntentResult {
  paymentId: string
  provider: 'simulated'
  status: 'pending' | 'approved' | 'failed' | 'cancelled'
  externalRef?: string
  amount?: number
  orderId?: string
  orderStatus?: string
  metadata?: Record<string, unknown>
}

export interface PaymentProvider {
  createIntent(input: PaymentIntentInput): Promise<PaymentIntentResult>
  confirmSimulated(
    paymentId: string,
    outcome: 'approve' | 'fail',
  ): Promise<PaymentIntentResult>
}

export interface PlaceOrderItemInput {
  productId: string
  quantity: number
}

export interface PlaceOrderInput {
  idempotencyKey: string
  addressId: string
  shippingOptionId: string
  paymentMethod: SimulatedPaymentMethod
  documentKind: 'cpf' | 'cnpj'
  documentValue: string
  items?: PlaceOrderItemInput[]
}

export interface PlaceOrderResult {
  orderId: string
  status: string
  total: number
  paymentId?: string
  alreadyExisted: boolean
}

/** Papéis futuros (admin) — Fase 1 só tipa. */
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

export interface CartItem {
  productId: string
  sku: string
  name: string
  price: number
  quantity: number
  imageUrl?: string | null
}

export type CartStorageKind = 'local' | 'supabase'

/**
 * Contrato de persistência do carrinho.
 * Visitante → localStorage (temporário)
 * Autenticado → sync Supabase (futuro)
 * Pedido → persistência definitiva no banco (futuro)
 */
export interface CartStorage {
  kind: CartStorageKind
  load(): CartItem[]
  save(items: CartItem[]): void
  clear(): void
}
