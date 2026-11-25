# HF Andar 1 — Mapa de dados

**Diagnóstico:** [HF_ANDAR_1_DIAGNOSTICO.md](./HF_ANDAR_1_DIAGNOSTICO.md)  
**SoT SQL:** `supabase/migrations_hf/`

## Tabelas existentes (reusar)

| Tabela | Uso Andar 1 |
|--------|-------------|
| products | Catálogo (status draft/published) |
| product_references | Códigos tipados |
| product_images | Imagens |
| product_categories / product_brands | Taxonomia / marcas |
| manufacturers / models / vehicle_versions | Veículos |
| product_vehicle_compatibility | Apps (year_start/end/notes) |
| imports / import_items | Importações |
| price_lists* | Preços staff |
| customers / catalogs / customer_vehicles | B2B / garagem |
| profiles | Roles |

## Colunas / tabelas novas (migrations 14–19)

| Migration | Alteração | Reversão |
|-----------|-----------|---------|
| 14_pvc_position_validation | PVC: lado, posicao_long, posicao_vert, validation_status; CHECK years | DROP COLUMN |
| 15_model_production_years | models: production_year_start/end, quality_status | DROP COLUMN |
| 16_search_products_pvc_years | RPC search_products usa faixa PVC | REPLACE função anterior |
| 17_campaigns | campaigns + campaign_products | DROP TABLE |
| 18_leads | leads + lead_items | DROP TABLE |
| 19_product_kits | products.product_kind, product_kit_components; products.is_featured | DROP |

## Relacionamentos canônicos

```text
products 1—N product_references
products 1—N product_images
products 1—N PVC —1 vehicle_versions
products 1—N product_kit_components → products (item)
campaigns N—N products via campaign_products
leads 1—N lead_items → products
```
