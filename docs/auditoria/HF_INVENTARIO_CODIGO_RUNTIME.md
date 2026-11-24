# Inventário de código e runtime HF

**Data:** 2026-11-23  
**Status:** CANÔNICO (evidência)  
**App:** `hf-comercio-de-pecas`

---

## 1. Feature flags (`src/config/features.ts`)

| Flag | Default | Efeito real observado |
|------|---------|------------------------|
| `catalog_enabled` | true | Declarada; pouco/nenhum gate direto no app |
| `customer_login_enabled` | true | Usada com catálogo específico em `B2bCatalogRoute` |
| `customer_specific_catalog_enabled` | **false** | **false** = published livre (sem login / sem lista por cliente) |
| `ecommerce_enabled` | false | Sem wiring de rotas |
| `price_enabled` | false | Vitrine sem preço; `attachResolvedPrices` / resolução condicionada |
| `inventory_enabled` | false | Sem UI/serviço |
| `quotation_enabled` | false | Sem UI |
| `orders_enabled` | false | Sem rotas |
| `cart_enabled` | false | Sem rotas |
| `checkout_enabled` | false | Sem rotas |
| `payment_enabled` | false | Sem MP no runtime |
| `freight_enabled` | false | Sem frete |
| `vehicle_plate_enabled` | false | `/veiculo` só seletor manual |

`isFeatureEnabled()` existe; a maioria das flags comerciais **não** registra rotas condicionais (`router.tsx` só importa `features` / void).

---

## 2. Identidade (`src/config/business.ts`)

Fonte declarada: SITE HF HTML.

- Empresa: HF Comércio de Peças / Guarulhos-SP  
- Posicionamento: suspensão, direção e freios; ambiente B2B  
- Contato: endereço Rosa Molina Pannochia, e-mails/telefones, Instagram `@hfsuspensao`  
- CTA WhatsApp: **somente** `VITE_WHATSAPP_NUMBER` (sem fallback hardcoded no CTA)

Tokens visuais: `src/styles/index.css` (`--hf-bg`, `--hf-red`, etc.) alinhados a `PRD_UX_B2B_1.0.md`.

---

## 3. Rotas

### Públicas (`MainLayout`)

| Path | Função |
|------|--------|
| `/` | Home |
| `/catalogo`, `/busca` | Catálogo (`B2bCatalogRoute`) |
| `/categoria/:slug`, `/categorias` | Categorias |
| `/marca/:slug`, `/marcas` | Marcas |
| `/produto/:id` | PDP |
| `/veiculo` | Aplicações |
| `/atendimento`, `/sobre` | Suporte / institucional |
| `/login`, `/cadastro`, `/recuperar-senha` | Auth |
| `/conta`, `/conta/perfil`, `/conta/veiculos` | Conta (`ProtectedRoute`) |

### Admin (`StaffRoute` + `AdminLayout`)

| Path | Módulo |
|------|--------|
| `/admin` | Dashboard |
| `produtos` (+ novo/:id) | CRUD produtos |
| `produtos/importacoes`, `importar`, `importar-aplicacoes`, `importar-hf` | Import |
| `categorias`, `montadoras`, `veiculos`, `fabricantes` | Taxonomia / apps |
| `fornecedores`, `importar-conversoes`, `importar-custos` | Fornecedores |
| `precos`, `precos/:id` | Listas de preço (staff) |
| `listas` | Catálogos B2B |
| `clientes`, `grupos` | Clientes B2B |
| `operadores` | Staff |

**Ausentes:** cart, checkout, orders, freight, payment, inventory ops.

---

## 4. Migrations

| Pasta | Qtd | Papel |
|-------|-----|-------|
| `supabase/migrations_hf/` | **18** `.sql` | **Fonte de verdade** HF |
| `supabase/migrations/` | **52** `.sql` | legado externo — **não aplicar** no HF |

### `migrations_hf/` (mapa)

| Arquivo | Propósito |
|---------|-----------|
| `01_core.sql` | Profiles, staff, base veículos |
| `02_catalog.sql` | Taxonomia, produtos, compat, suppliers |
| `03_b2b.sql` | Groups, customers, catalogs |
| `04_rls.sql` | RLS + grants |
| `05_search_products_b2b.sql` | RPC busca |
| `06` + `06b`–`06f` | Pipeline import + price/cost/conversion RPCs |
| `07_storage_product_images.sql` | Storage |
| `08_public_published_catalog.sql` | Leitura **anon** de published |
| `09_fix_search_products_refs.sql` | No-op / fix |
| `10_seed_commercial_categories.sql` | Seed categorias |
| `11_hf_categories_scope.sql` | Escopo Suspensão/Direção/Freios/Transmissão |
| `20261007190000_hf_f1_foundation.sql` | Blob monolítico F1 — **overlap** com cadeia numerada |

**Risco:** banco novo deve seguir **um** caminho (numerada **ou** foundation), não ambos cegamente.

---

## 5. Comércio: removido / preparado / morto

| Área | Estado |
|------|--------|
| Cart / checkout / MP / frete / orders UI | Removido |
| Admin pricing + supplier cost/conversion | Preparado / ativo staff |
| `priceResolutionService` | Preparado (flag) |
| `adminCustomerService` (`orders`) | Morto / órfão |
| `favoriteService` | Morto (sem tabela HF) |
| `AddressForm` + `services/address/*` | Preparado sem imports |
| SQL ecommerce em `migrations/` | Arquivo legado externo |

---

## 6. Testes (Vitest — 10 arquivos)

| Arquivo | Área |
|---------|------|
| `productImportCore.test.ts` | Import produtos |
| `applicationImportCore.test.ts` | Import aplicações |
| `productsImportApplyAudit.test.ts` | Audit apply produtos |
| `applicationsImportApplyAudit.test.ts` | Audit apply apps |
| `normalizeText.test.ts` | Normalização |
| `decodeImportCsvText.test.ts` | CSV |
| `adminCostImportHf.test.ts` | Custo HF |
| `adminCategoryService.test.ts` | Categorias admin |
| `pricingFormulas.test.ts` | Fórmulas preço |
| `categoryEmoji.test.ts` | Helper UI |

**Sem testes:** auth, router, search E2E, RLS, WhatsApp, UI.

---

## 7. Ambiente (`.env.example`)

| Variável | Obrigatória | Nota |
|----------|-------------|------|
| `VITE_SUPABASE_URL` | Sim | Projeto HF `owllmfcpbodqmoerdfxx` |
| `VITE_SUPABASE_ANON_KEY` | Sim | Nunca referência |
| `VITE_WHATSAPP_NUMBER` | Para CTA | E.164 só dígitos |

---

## 8. Stack

React 19 + Vite + React Router 7 + Tailwind 4 + Supabase (Auth, Postgres, Storage, RLS) — ver `docs/ARQUITETURA_HF.md`.
