# Auditoria profunda — Telas e funções HF

**Data:** 2026-11-23  
**Status:** CANÔNICO (evidência runtime)  
**Fonte:** `src/app/router.tsx`, `src/pages/**`, `src/services/**`  
**Guards:** `B2bCatalogRoute`, `ProtectedRoute`, `StaffRoute`

---

## 1. Legenda

| Status | Significado |
|--------|-------------|
| OK | Rota + página + serviço alinhados |
| PARCIAL | UI existe; gap de dado/flag/serviço |
| MORTO | Arquivo/página sem rota ou serviço órfão |
| PREP | Preparado; flag comercial off |

---

## 2. Telas públicas / loja

| Rota | Página | Função / comportamento | Serviços principais | Status |
|------|--------|------------------------|---------------------|--------|
| `/` | `HomePage` | Hero, busca, caminhos, destaques, marcas, WA | search/products, categories, brands, businessConfig | OK |
| `/catalogo` | `CatalogPage` | Listagem + filtros; via `B2bCatalogRoute` | `searchService` → RPC `search_products` | OK |
| `/busca` | `CatalogPage` | Alias de busca | idem | OK |
| `/categoria/:slug` | `CategoryPage` | Catálogo filtrado por categoria | search + categories | OK |
| `/marca/:slug` | `BrandPage` | Catálogo filtrado por marca | search + brands | OK |
| `/categorias` | `CategoriesIndexPage` | Índice de categorias | `categoryService` | OK |
| `/marcas` | `BrandsIndexPage` | Índice de marcas | `brandService` | OK |
| `/produto/:id` | `ProductPage` | PDP: refs, apps, CTA WhatsApp; sem comprar | `productService`, compat, WA | OK |
| `/veiculo` | `VehiclePage` | Seletor montadora/modelo/versão → peças | `vehicleService`, search | OK (sem placa) |
| `/atendimento` | `AtendimentoPage` | Contato / WA | businessConfig | OK |
| `/sobre` | `SobrePage` | Institucional | businessConfig | OK |
| `/login` | `LoginPage` | Auth email/senha | `authService` | OK |
| `/cadastro` | `RegisterPage` | Cadastro (sem CPF obrigatório) | `authService` | OK |
| `/recuperar-senha` | `ForgotPasswordPage` | Reset | `authService` | OK |
| `/conta` | `AccountHomePage` | Resumo conta (auth) | `customerService` | OK |
| `/conta/perfil` | `AccountProfilePage` | Perfil | auth/customer | OK |
| `/conta/veiculos` | `AccountVehiclesPage` | Garagem seed | `customerVehicleService` → `customer_vehicles` | **PARCIAL** (ver tabelas) |

**Gate catálogo:** com `customer_specific_catalog_enabled: false`, `B2bCatalogRoute` **não** exige login; published é público (migration 08).

**Ausentes de propósito (flags off):** `/carrinho`, `/checkout`, `/pedido/*`, frete, pagamento.

---

## 3. Telas admin (`/admin/*` + `StaffRoute`)

| Rota | Página | Função | Serviços | Status |
|------|--------|--------|----------|--------|
| `/admin` | `AdminDashboardPage` | Hub admin | links estáticos | OK |
| `produtos` | `AdminProductsPage` | Lista produtos | `adminProductService` | OK |
| `produtos/novo` | `AdminProductFormPage` | Criar produto | adminProduct, images, refs, PVC | OK |
| `produtos/:id` | `AdminProductFormPage` | Editar produto | idem | OK |
| `produtos/importacoes` | `AdminImportsHubPage` | Hub imports | links | OK |
| `produtos/importar` | `AdminProductImportPage` | Import produtos | import core + `adminCatalogImportService` + RPC apply products | OK |
| `produtos/importar-aplicacoes` | `AdminApplicationsImportPage` | Import apps | applicationImport + RPC | OK |
| `produtos/importar-hf` | `AdminHfBundleImportPage` | Bundle HF | `adminHfBundleImportService` | OK |
| `categorias` | `AdminCategoriesPage` | Árvore categorias | `adminCategoryService` | OK |
| `montadoras` | `AdminManufacturersPage` | Montadoras | `adminManufacturerService` | OK |
| `veiculos` | `AdminVehiclesPage` | Modelos/versões | `adminVehicleService` | OK |
| `fabricantes` | `AdminBrandsPage` | Marcas peça | `adminBrandService` | OK |
| `fornecedores` | `AdminSuppliersPage` | Fornecedores | `adminSupplierService` | OK |
| `fornecedores/importar-conversoes` | `AdminSupplierConversionImportPage` | Conversão códigos | conversion import + RPC | OK |
| `fornecedores/importar-custos` | `AdminSupplierCostImportPage` | Custos | cost import + RPC | OK |
| `precos` | `AdminPriceListsPage` | Listas preço staff | `adminPriceListService` | PREP (vitrine off) |
| `precos/:id` | `AdminPriceListDetailPage` | Itens + import preço | price list/override/import | PREP |
| `listas` | `AdminCatalogsPage` | Catálogos B2B | `adminCatalogListService` | OK |
| `clientes` | `AdminCustomersPage` | Clientes B2B | `adminB2bCustomerService` | OK |
| `grupos` | `AdminCustomerGroupsPage` | Grupos B2B | admin B2B | OK |
| `operadores` | `AdminOperatorsPage` | Staff roles | `adminOperatorsService` / staff | OK |

| Arquivo | Status |
|---------|--------|
| `AdminPlaceholderPage.tsx` | **MORTO** (sem rota) |
| `AccountPage.tsx` | provavelmente legado; conta usa AccountHome | 

---

## 4. Mapa serviços → responsabilidade

### Loja / conta

| Serviço | Função |
|---------|--------|
| `search/searchService` | Busca paginada via RPC; enriquece meta; preços se flag |
| `products/productService` | Get produto published; mocks se sem Supabase |
| `products/compatibilitySummary` | Resumo apps no card |
| `categories/categoryService` | Categorias públicas |
| `brands/brandService` | Marcas públicas |
| `vehicles/vehicleService` | Cascata montadora/modelo/versão |
| `pricing/priceResolutionService` | Resolve preço se `price_enabled` |
| `pricing/pricingFormulas` | Matemática margem/markup |
| `customers/customerService` | Vínculo profile↔customer |
| `customers/customerVehicleService` | CRUD veículos conta |
| `customers/favoriteService` | **MORTO** (sem UI/tabela HF) |
| `customers/accountDeletionService` | Exclusão conta |
| `supabase/authService` | Login/registro/reset |
| `address/*` | CEP — **PREP** (AddressForm sem uso em rotas) |

### Admin / import

| Serviço | Função |
|---------|--------|
| `admin/adminProductService` | CRUD produtos staff |
| `admin/adminImageService` | Imagens storage |
| `admin/adminCategoryService` | Categorias |
| `admin/adminBrandService` | Marcas |
| `admin/adminManufacturerService` | Montadoras |
| `admin/adminVehicleService` | Veículos |
| `admin/adminSupplierService` | Fornecedores |
| `admin/adminCatalogImportService` | Apply produtos |
| `admin/adminApplicationsImportService` | Apply apps |
| `admin/adminHfBundleImportService` | Bundle |
| `admin/adminConversionImportService` | Conversões |
| `admin/adminCostImportService` | Custos |
| `admin/adminPriceListService` | Listas |
| `admin/adminPriceOverrideService` | Overrides |
| `admin/priceImportParser` + `priceImportActions` | Wizard preço |
| `admin/adminCatalogListService` | Listas B2B |
| `admin/adminB2bCustomerService` | Clientes/grupos B2B |
| `admin/adminOperatorsService` + `staffService` | Operadores |
| `admin/adminCustomerService` | **MORTO** (referencia orders) |
| `import/*` | Parse CSV/XLSX, validate, cores produto/app |

---

## 5. Funcionamento ponta a ponta (fluxos HF)

### A) Descoberta → consulta WA

```text
Home/Busca/Categoria/Marca/Veículo
  → search_products (RLS + published)
  → Card → PDP
  → CTA WhatsApp (VITE_WHATSAPP_NUMBER)
  → Pedido oficial: fora do app (humano + Sidicom)
```

### B) Cadastro produto manual

```text
Admin → produtos/novo
  → products + images + references + PVC
  → status draft|published|archived
```

### C) Import catálogo

```text
Hub import → parse arquivo → preview → apply_* RPC
  → produtos em draft (regra)
  → staff publica
```

### D) B2B (admin)

```text
grupos + clientes + listas (catalogs)
  → catalog_products / customer_*_catalogs
  → customer_can_see_product (quando flag específica on)
```

---

## 6. Achados críticos (telas/funções)

| ID | Achado | Severidade |
|----|--------|------------|
| T1 | `customer_vehicles` usado na UI conta; confirmar existência no SQL aplicado | Alta |
| T2 | `favoriteService` / `adminCustomerService` / AddressForm órfãos | Média |
| T3 | Flags commerce declaradas sem rotas | Baixa (ok MVP) |
| T4 | Preço admin PREP vs vitrine off — coerente | Info |
| T5 | `AdminPlaceholderPage` morto | Baixa |
| T6 | D1: catálogo público vs docs “B2B autenticado” | Alta (doc/produto) |
