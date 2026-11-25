# Auditoria profunda — Tabelas e RPCs HF (`migrations_hf`)

**Data:** 2026-11-23  
**Status:** CANÔNICO (evidência)  
**SoT SQL:** `supabase/migrations_hf/`  
**Proibido:** aplicar `supabase/migrations/` (legado externo) no projeto HF

---

## 1. Grafo de relações (HF)

```text
auth.users
  └── profiles (role staff | cliente)
        └── customer_users ── customers ── customer_groups
                                │              └── customer_group_catalogs ── catalogs
                                └── customer_catalogs ─────────────────────┘
                                                                      catalogs ── catalog_products ── products

manufacturers ── models ── vehicle_versions
                              └── product_vehicle_compatibility ── products

product_categories (árvore) ── products
product_brands ── products
suppliers ── products
         └── supplier_products ── products

products ── product_images
         ── product_references
         ── price_list_items ── price_lists
                              ── price_change_history

imports ── import_items
import_profiles
```

**Não existem no `migrations_hf`:** `orders`, `carts`, `inventory`, `payments`, `shipments`, `favorites`, `customer_addresses`, `customer_vehicles`.

---

## 2. Tabelas — catálogo de campos e uso

### 2.1 Identidade

| Tabela | Campos-chave | Quem escreve | Quem lê | Tela |
|--------|--------------|--------------|---------|------|
| `profiles` | id, role, full_name, phone | Auth trigger + staff | App / admin operadores | Login, operadores |
| `manufacturers` | name, slug, status | Admin | Veículo / apps | montadoras, /veiculo |
| `models` | manufacturer_id, name, slug | Admin | idem | veiculos |
| `vehicle_versions` | manufacturer/model, year, engine, version_name | Admin | PVC + seletor | veiculos, /veiculo |

### 2.2 Catálogo

| Tabela | Campos-chave | Notas |
|--------|--------------|-------|
| `product_categories` | parent_id, name, slug, status, sort_order | Árvore; L1 HF scoped |
| `product_brands` | name, slug, logo_path, status | Marca da peça ≠ montadora |
| `suppliers` | name, code, cnpj, status | Fornecedor |
| `products` | sku, name, slug, brand_id, category_id, supplier_id, price, promo_price, **status**, posicao, lado, attrs, is_available, is_incomplete | `status` = visibilidade; price espelho; is_available ≠ publicação |
| `product_images` | product_id, storage_path, is_primary | Storage `product-images` |
| `product_references` | code, ref_type | OEM etc. |
| `product_vehicle_compatibility` | product_id, vehicle_version_id, year_start, year_end | Fitment |
| `supplier_products` | supplier_sku, product_id | Conversão |

### 2.3 Import

| Tabela | Campos-chave | Notas |
|--------|--------------|-------|
| `imports` | kind, status, file_name, summary, price_list_id? | Pipeline |
| `import_items` | payload / erros | Linhas |
| `import_profiles` | mapeamentos | Perfis |

### 2.4 B2B

| Tabela | Campos-chave | Notas |
|--------|--------------|-------|
| `customer_groups` | name, code, status | |
| `customers` | legal_name, trade_name, cnpj, status pending/active/suspended | B2B |
| `customer_users` | customer_id, profile_id, is_primary | Liga auth |
| `catalogs` | name, code | Listas de visibilidade |
| `catalog_products` | catalog_id, product_id | |
| `customer_group_catalogs` | group ↔ catalog | |
| `customer_catalogs` | customer ↔ catalog | |

### 2.5 Preço (staff / PREP)

| Tabela | Campos-chave | Notas |
|--------|--------------|-------|
| `price_lists` | scope, priority, pricing_method, is_default | Vitrine gated |
| `price_list_items` | price, extra_cost, price_origin | |
| `price_change_history` | old/new, source | Auditoria |

---

## 3. RPCs / functions

| Função | Papel | Usado por |
|--------|-------|-----------|
| `set_updated_at` | Trigger updated_at | Várias tabelas |
| `f_unaccent` | Busca | search |
| `is_staff` | AuthZ | RLS / admin |
| `handle_new_user` | Cria profile | Auth |
| `protect_profile_role` | Impede auto-escalar role | Auth |
| `current_customer_ids` | IDs B2B do user | Visibilidade |
| `customer_can_see_product` | Gate produto | RLS / search (simplificado se público) |
| `search_products` | Busca catálogo | `searchService` |
| `apply_catalog_products_import` | Apply import produtos | Admin import |
| `apply_catalog_applications_import` | Apply apps | Admin apps |
| `apply_supplier_conversion_import` | Conversões | Admin |
| `apply_supplier_cost_import` | Custos | Admin |
| `apply_price_list_import` | Preços | Admin preços |
| `staff_can_import_catalog` | Gate import | RLS |
| `slug_from_sku` / `slug_from_name` | Helpers | Import |
| `_validate_product_posicao` | Validação | Import |
| `recalculate_calculated_for_products` | Recálculo preço | Pricing |

---

## 4. Storage

| Bucket (doc) | Uso |
|--------------|-----|
| `product-images` | Imagens produto |
| `logos` | Logos |
| `imports` | Arquivos import |

---

## 5. Drift código × schema (achados)

| ID | Achado | Evidência | Ação sugerida |
|----|--------|-----------|---------------|
| S1 | **`customer_vehicles` NÃO está em `migrations_hf`**, mas `customerVehicleService` e `/conta/veiculos` usam a tabela | Grep migrations_hf = 0; service `.from('customer_vehicles')` | Criar migration HF **ou** desabilitar tela até schema |
| S2 | `favoriteService` sem tabela `favorites` no HF | Sem create table | Remover serviço |
| S3 | `adminCustomerService` referencia `orders` | Sem tabela orders HF | Remover/isolar |
| S4 | Overlap cadeia `01`–`11` vs `20261007190000_hf_f1_foundation.sql` | Dois caminhos | Runbook fresh DB |
| S5 | `products.price` / `is_available` existem mas não governam publicação | MODELO_CATALOGO | Manter disciplina status |

---

## 6. O que está no legado externo e NÃO no HF SoT

(Presente em `fonte-pecas` / `supabase/migrations` legado — **não aplicar**):  
`carts`, `cart_items`, `orders`, `order_items`, `inventory`, `inventory_movements`, `payments`, `shipping_quotes`, `shipments`, `customer_addresses`, `favorites`, `app_notifications`, etc.

SoT operacional desses domínios na empresa hoje: **Sidicom** (ver `HF_SIDICOM_E_TRANSICAO.md`).
