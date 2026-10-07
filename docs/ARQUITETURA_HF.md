# Arquitetura HF Comércio de Peças

## Stack

React 19 + TypeScript + Vite + React Router 7 + Tailwind 4 + Supabase (Auth, Postgres, Storage, RLS)

## Camadas

```text
Browser
  → pages / components
  → hooks / contexts (Auth)
  → services
  → lib/supabase.ts (anon)
  → Supabase HF
```

UI **não** chama `supabase.from` diretamente.

## Feature flags

`src/config/features.ts` — ecommerce/cart/checkout/payment/freight/price/inventory/placa = **false** no MVP.

## Config de negócio

`src/config/business.ts` — `companyName`, `whatsappNumber` via `VITE_WHATSAPP_NUMBER`.

## Schema mínimo MVP (aplicar no Supabase HF)

Tabelas: `profiles`, `product_categories`, `product_brands`, `products`, `product_images`, `product_references`, `manufacturers`, `models`, `vehicle_versions`, `product_vehicle_compatibility`, `suppliers`, `supplier_products`, `imports`, `import_items`, `import_profiles`

Storage: `product-images`, `logos`, `imports`

RPCs: `is_staff`, `search_products`, `apply_catalog_products_import`, `apply_catalog_applications_import`, `admin_search_users`, `admin_set_user_role`

## Migrations — política

**Não** aplicar cegamente as 52 migrations FAL.

| Classificação | Exemplos |
|---------------|----------|
| APLICAR_HF | fase2 (fatiada), fase3 storage, fase4 search, import products/apps, posicao/lado, operators, import_profiles |
| ADAPTAR | fase2 (cortar carts/orders/payments), fase5 role protect, imports.kind |
| NÃO_APLICAR_MVP | fase6+ ecommerce, MP, inventory modes, price list RPCs operacionais, seeds comerciais FAL |

Lista detalhada: inventário da auditoria GATE 01 (52 arquivos em `supabase/migrations/`).

## Projeto Supabase

- Org: HF COMERCIO DE PEÇAS  
- Projeto ref: `owllmfcpbodqmoerdfxx`  
- Região: `sa-east-1`  
- **Proibido** usar projeto/credenciais FAL
